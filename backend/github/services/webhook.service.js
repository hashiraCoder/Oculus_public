import { baselineQueue } from '../../queues/index.js';
import { dispatchScan, SCAN_PRIORITY } from '../../scanner/scheduler/scan-scheduler.js';
import GithubWebhookRepository from '../repositories/github-webhook.repository.js';
import { findByGithubInstallationId } from '../../repositories/workspace.repository.js';
import { findByGithubRepoId } from '../../repositories/repository.repository.js';
import { createGithubScan } from '../../repositories/scan.repository.js';
import RepositorySyncService from './repository-sync.service.js';
import { query } from '../../config/db.js';
import logger from '../../config/logger.js';

class WebhookService {
    static async handleWebhook({ event, deliveryId, payload }) {
        // 1. Filter events initially: allow push, pull_request, installation, installation_repositories, ping
        if (!['installation', 'installation_repositories', 'pull_request', 'push', 'ping'].includes(event)) {
            return { ignored: true, reason: 'Unsupported event' };
        }
        
        // 2. Parse payload if it's a buffer (because of express.raw)
        let data;
        try {
            data = Buffer.isBuffer(payload) ? JSON.parse(payload.toString('utf8')) : payload;
        } catch (error) {
            return { ignored: true, reason: 'Invalid JSON payload' };
        }

        const action = data.action;
        const installationId = data.installation?.id;
        const githubRepoId = data.repository?.id;
        
        // 3. For PR events, we only support opened, synchronize, reopened, closed
        if (event === 'pull_request' && !['opened', 'synchronize', 'reopened', 'closed'].includes(action)) {
            return { ignored: true, reason: 'Unsupported pull_request action' };
        }

        // 4. Validate and fetch internal DB IDs
        let workspaceId = null;
        let repositoryId = null;

        if (installationId) {
            const workspace = await findByGithubInstallationId(installationId);
            if (workspace) {
                workspaceId = workspace.id;
            }
        }

        if (githubRepoId) {
            const repository = await findByGithubRepoId(githubRepoId);
            if (repository) {
                repositoryId = repository.id;
                // Double check if workspace mismatch
                if (!workspaceId) workspaceId = repository.workspace_id;
            }
        }

        const eventRecord = await GithubWebhookRepository.createEvent({
            deliveryId,
            eventType: event,
            action,
            installationId,
            repositoryId
        });

        logger.debug(`[WebhookService] eventRecord created: ${!!eventRecord}`);

        // If eventRecord is null, it means deliveryId already exists (duplicate)
        if (!eventRecord) {
            return { ignored: true, reason: 'Duplicate deliveryId' };
        }

        // 6. Process webhook directly (previously done by githubWebhookWorker)
        const pullNumber = data.pull_request?.number;
        const headSha = data.pull_request?.head?.sha;
        const baseSha = data.pull_request?.base?.sha;
        const owner = data.repository?.owner?.login;
        const repositoryName = data.repository?.name;

        try {
            if (event === 'installation' || event === 'installation_repositories') {
                if (workspaceId) {
                    if (['deleted', 'suspend'].includes(action)) {
                        const { disconnectWorkspaceGithubConnection } = await import('../../repositories/workspace.repository.js');
                        await disconnectWorkspaceGithubConnection({ workspaceId });
                        logger.info(`[WebhookService] Disconnected GitHub for workspace ${workspaceId} due to ${action}`);
                    } else if (['created', 'unsuspend', 'new_permissions_accepted', 'added', 'removed'].includes(action)) {
                        await RepositorySyncService.syncRepositoriesForWorkspace(installationId, workspaceId);
                        logger.info(`[WebhookService] Synced repositories for workspace ${workspaceId} due to ${action}`);
                    }
                }
            } else if (event === 'pull_request') {
                // For opened or synchronize, we want to scan
                if (['opened', 'synchronize', 'reopened'].includes(action)) {
                    
                    let githubIdentityId = null;
                    if (data.pull_request?.user && workspaceId) {
                        const user = data.pull_request.user;
                        const identityRes = await query(`
                            INSERT INTO github_developer_identities (workspace_id, github_user_id, github_username)
                            VALUES ($1, $2, $3)
                            ON CONFLICT (workspace_id, github_user_id) 
                            DO UPDATE SET github_username = EXCLUDED.github_username
                            RETURNING id
                        `, [workspaceId, user.id.toString(), user.login]);
                        githubIdentityId = identityRes.rows[0].id;
                        logger.debug(`[WebhookService] identity extracted: ${githubIdentityId}`);
                    } else {
                        logger.debug(`[WebhookService] identity not extracted. data.pull_request?.user: ${!!data.pull_request?.user}, workspaceId: ${workspaceId}`);
                    }

                    const headRef = data.pull_request?.head?.ref;
                    const triggerSource = `github_webhook:pull_request:${action}`;

                    logger.info(`[WebhookService] creating scan for workspace: ${workspaceId}`);
                    const scan = await createGithubScan({
                        repositoryId,
                        prNumber: pullNumber,
                        commitHash: headSha,
                        githubDeliveryId: deliveryId,
                        headSha,
                        branch: headRef,
                        triggeredBy: 'WEBHOOK',
                        triggerSource: triggerSource,
                        githubIdentityId,
                        workspaceId,
                        outboxEvent: {
                            eventType: 'scan_started',
                            payload: {
                                installationId,
                                owner,
                                repo: repositoryName,
                                headSha,
                                status: 'in_progress',
                                repositoryId,
                                workspaceId
                            }
                        }
                    });

                    // Push via ScanScheduler at P0 (highest priority — webhook-triggered PR)
                    await dispatchScan({
                        scanId: scan.id,
                        installationId,
                        workspaceId,
                        repositoryId,
                        pullNumber,
                        headSha,
                        baseSha,
                        owner,
                        repositoryName,
                        githubIdentityId,
                        priority: SCAN_PRIORITY.P0_CRITICAL,
                        jobId: `scan-${repositoryId}-${pullNumber}-${headSha ? headSha.slice(0, 8) : 'head'}-${scan.id}`
                    });
                } else if (action === 'closed') {
                    if (!data.pull_request?.merged) {
                        return { ignored: true, reason: 'PR closed but not merged' };
                    }
                    
                    logger.info(`[WebhookService] PR merged, creating baseline scan for workspace: ${workspaceId}`);
                    const headRef = data.pull_request?.base?.ref || 'main'; // Base ref is where it was merged into
                    const triggerSource = `github_webhook:pull_request:merged`;
                    const mergeCommitSha = data.pull_request?.merge_commit_sha || baseSha;

                    const scan = await createGithubScan({
                        repositoryId,
                        prNumber: pullNumber,
                        commitHash: mergeCommitSha,
                        githubDeliveryId: deliveryId,
                        headSha: mergeCommitSha,
                        branch: headRef,
                        triggeredBy: 'WEBHOOK',
                        triggerSource: triggerSource,
                        workspaceId
                    });

                    // Queue baseline scan
                    await baselineQueue.add('baseline-scan', {
                        scanId: scan.id,
                        installationId,
                        workspaceId,
                        owner,
                        repo: repositoryName,
                        headSha: mergeCommitSha,
                        branch: headRef
                    });
                    
                    // NO Check Run event created for baseline scans.
                }
            } else if (event === 'push') {
                const ref = data.ref;
                const beforeSha = data.before;
                const afterSha = data.after;
                const isDeleted = Boolean(data.deleted) || !afterSha || afterSha === '0000000000000000000000000000000000000000';

                // 1. Filter out deleted branches and zero-SHAs
                if (isDeleted) {
                    logger.info(`[WebhookService] Ignoring deleted push ref: ${ref} on repo ${repositoryId}`);
                    await GithubWebhookRepository.markEventProcessed(deliveryId);
                    return { ignored: true, reason: 'Branch deletion push' };
                }

                // 2. Filter out non-branch pushes (e.g. tag pushes: refs/tags/v1.0.0)
                if (!ref || !ref.startsWith('refs/heads/')) {
                    logger.info(`[WebhookService] Ignoring non-branch push ref: ${ref} on repo ${repositoryId}`);
                    await GithubWebhookRepository.markEventProcessed(deliveryId);
                    return { ignored: true, reason: 'Non-branch push ref' };
                }

                const branch = ref.replace(/^refs\/heads\//, '');

                // 3. Resolve and validate repository and tenant boundary
                if (!repositoryId || !workspaceId) {
                    logger.warn(`[WebhookService] Push event missing repository or workspace mapping: repo:${githubRepoId} inst:${installationId}`);
                    await GithubWebhookRepository.markEventProcessed(deliveryId);
                    return { ignored: true, reason: 'Unmapped repository or workspace' };
                }

                const repoRecord = await findByGithubRepoId(githubRepoId);
                if (!repoRecord || repoRecord.workspace_id !== workspaceId) {
                    logger.warn(`[WebhookService] Tenant boundary violation for push: repo ${githubRepoId} does not belong to workspace ${workspaceId}`);
                    await GithubWebhookRepository.markEventFailed(deliveryId);
                    return { ignored: true, reason: 'Tenant boundary violation' };
                }

                if (repoRecord.is_scanning_enabled === false) {
                    logger.info(`[WebhookService] Scanning disabled for repository ${repoRecord.id}`);
                    await GithubWebhookRepository.markEventProcessed(deliveryId);
                    return { ignored: true, reason: 'Scanning disabled for repository' };
                }

                // 4. Branch Policy: Enforce repository default_branch
                const defaultBranch = repoRecord.default_branch || 'main';
                if (branch !== defaultBranch) {
                    logger.info(`[WebhookService] Ignoring push to non-default branch: ${branch} (default: ${defaultBranch})`);
                    await GithubWebhookRepository.markEventProcessed(deliveryId);
                    return { ignored: true, reason: `Push to non-default branch (${branch})` };
                }

                // 5. Tier 2 Scan Target Deduplication (Active or Completed scan on this exact commit SHA)
                const existingScanRes = await query(
                    `SELECT id, status FROM scans 
                     WHERE repository_id = $1 AND commit_hash = $2 AND status IN ('QUEUED', 'DISPATCHED', 'SCANNING', 'PASSED', 'FAILED')
                     LIMIT 1`,
                    [repositoryId, afterSha]
                );

                if (existingScanRes.rows.length > 0) {
                    logger.info(`[WebhookService] Scan already exists for repository ${repositoryId} at commit ${afterSha} (scanId: ${existingScanRes.rows[0].id}, status: ${existingScanRes.rows[0].status})`);
                    await GithubWebhookRepository.markEventProcessed(deliveryId);
                    return { ignored: true, reason: 'Scan target already exists for commit', scanId: existingScanRes.rows[0].id };
                }

                // 6. Optional Developer Identity
                let githubIdentityId = null;
                const user = data.sender || data.head_commit?.author;
                if (user?.id && workspaceId) {
                    try {
                        const identityRes = await query(`
                            INSERT INTO github_developer_identities (workspace_id, github_user_id, github_username)
                            VALUES ($1, $2, $3)
                            ON CONFLICT (workspace_id, github_user_id) 
                            DO UPDATE SET github_username = EXCLUDED.github_username
                            RETURNING id
                        `, [workspaceId, user.id.toString(), user.login || user.username || 'unknown']);
                        githubIdentityId = identityRes.rows[0]?.id || null;
                    } catch (identErr) {
                        logger.warn(`[WebhookService] Failed to record developer identity (non-fatal): ${identErr.message}`);
                    }
                }

                // 7. Create Scan Record (Commit-Pinned)
                const triggerSource = 'github_webhook:push';
                const scan = await createGithubScan({
                    repositoryId,
                    prNumber: null,
                    commitHash: afterSha,
                    githubDeliveryId: deliveryId,
                    headSha: afterSha,
                    branch,
                    triggeredBy: 'WEBHOOK',
                    triggerSource,
                    githubIdentityId,
                    workspaceId,
                    outboxEvent: {
                        eventType: 'scan_started',
                        payload: {
                            installationId,
                            owner,
                            repo: repositoryName,
                            headSha: afterSha,
                            status: 'in_progress',
                            repositoryId,
                            workspaceId
                        }
                    }
                });

                // 8. Queue Scan via Central ScanScheduler
                await dispatchScan({
                    scanId: scan.id,
                    installationId,
                    workspaceId,
                    repositoryId,
                    pullNumber: null,
                    headSha: afterSha,
                    baseSha: beforeSha || null,
                    owner,
                    repositoryName,
                    githubIdentityId,
                    branch,
                    priority: SCAN_PRIORITY.P0_CRITICAL,
                    jobId: `scan-${repositoryId}-push-${afterSha.slice(0, 8)}-${scan.id}`
                });

                logger.info(`[WebhookService] Successfully created and dispatched push scan ${scan.id} for repo ${owner}/${repositoryName} at commit ${afterSha}`);
            }

            await GithubWebhookRepository.markEventProcessed(deliveryId);
        } catch (error) {
            await GithubWebhookRepository.markEventFailed(deliveryId);
            logger.error(`[WebhookService] Failed to process webhook ${deliveryId}:`, error);
            throw error; // Let Express return 500 so GitHub retries the delivery
        }

        return { success: true };
    }
}

export default WebhookService;
