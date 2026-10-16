import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import config from '../../config/env.js';
import logger from '../../config/logger.js';
import ApiError from '../../utils/apiError.js';
import {
    findUserWorkspaceRole,
    upsertWorkspaceGithubConnection,
    disconnectWorkspaceGithubConnection,
    updateWorkspaceSyncStatus,
} from '../../repositories/workspace.repository.js';
import { buildGithubAppJwt } from './github-auth.service.js';
import RepositorySyncService from './repository-sync.service.js';
import { query } from '../../config/db.js';
import { baselineQueue } from '../../queues/index.js';

class InstallationService {
    static async generateInstallUrl({ workspaceId, userId }) {
        const workspaceRole = await findUserWorkspaceRole(userId, workspaceId);

        if (workspaceRole !== 'OWNER') {
            throw new ApiError(403, 'Only workspace owners can connect GitHub.');
        }

        const payload = {
            workspaceId,
            userId,
            nonce: crypto.randomUUID(),
            purpose: 'github_install'
        };

        const state = jwt.sign(payload, config.jwt.secret, { expiresIn: '15m' });
        
        const appName = process.env.GITHUB_APP_NAME || 'oculus-security-scanner';
        const installUrl = `https://github.com/apps/${appName}/installations/new?state=${state}`;
        
        console.log({
            githubAppName: appName,
            stateLength: state.length,
            installUrl
        });
        
        return installUrl;
    }

    static async processCallback({ installationId, setupAction, state }) {
        if (!state) throw new ApiError(400, 'Missing state parameter');
        
        let decoded;
        try {
            decoded = jwt.verify(state, config.jwt.secret);
        } catch (error) {
            throw new ApiError(401, 'Invalid or expired state parameter');
        }

        if (decoded.purpose !== 'github_install') {
            throw new ApiError(401, 'Invalid state purpose');
        }

        const { workspaceId, userId } = decoded;

        // Verify workspace ownership again just in case
        const workspaceRole = await findUserWorkspaceRole(userId, workspaceId);
        if (workspaceRole !== 'OWNER') {
            throw new ApiError(403, 'Only workspace owners can connect GitHub.');
        }

        // Verify installation via GitHub API
        const appToken = buildGithubAppJwt().token;
        const response = await fetch(`${config.github.apiBaseUrl}/app/installations/${installationId}`, {
            headers: {
                Accept: 'application/vnd.github+json',
                Authorization: `Bearer ${appToken}`,
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });

        if (!response.ok) {
            logger.error(`[InstallationService] Failed to verify installation ${installationId}: ${response.status}`);
            throw new ApiError(400, 'Invalid GitHub installation.');
        }

        const installation = await response.json();
        
        const accountLogin = installation?.account?.login;
        const accountType = installation?.account?.type;

        await upsertWorkspaceGithubConnection({ 
            workspaceId, 
            installationId,
            accountLogin,
            accountType
        });

        // Fire sync asynchronously — do not block the HTTP response
        InstallationService._runSyncAsync(installationId, workspaceId).catch(err => {
            logger.error(`[InstallationService] Background sync failed for workspace ${workspaceId}:`, err);
        });

        return { success: true };
    }

    /**
     * Runs repository synchronization and baseline scan enqueuing asynchronously.
     * Previously handled by the github-sync BullMQ worker.
     * Errors are logged but do not propagate to the HTTP response.
     */
    static async _runSyncAsync(installationId, workspaceId) {
        try {
            await updateWorkspaceSyncStatus(workspaceId, 'SYNCING');
            const repositories = await RepositorySyncService.syncRepositoriesForWorkspace(installationId, workspaceId);
            
            // Enqueue baseline scans for all upserted repositories
            let queuedCount = 0;
            for (const repo of repositories || []) {
                // Check if baseline scan already exists and is active
                const existingRes = await query(
                    `SELECT id FROM scans WHERE repository_id = $1 AND pr_number IS NULL AND status IN ('QUEUED', 'SCANNING')`,
                    [repo.id]
                );
                if (existingRes.rows.length > 0) {
                    logger.info(`[InstallationService] Baseline scan already active for repository ${repo.id}. Skipping.`);
                    continue;
                }

                const scanResult = await query(
                    `INSERT INTO scans (repository_id, pr_number, commit_hash, status, triggered_by, head_sha)
                     VALUES ($1, NULL, $2, 'QUEUED', 'WEBHOOK', $2)
                     RETURNING id`,
                    [repo.id, repo.default_branch]
                );
                const scanId = scanResult.rows[0].id;
                
                await baselineQueue.add('baseline-scan', {
                    scanId,
                    installationId,
                    workspaceId,
                    repositoryId: repo.id,
                    owner: repo.full_name.split('/')[0],
                    repositoryName: repo.name,
                    defaultBranch: repo.default_branch
                }, {
                    jobId: `baseline-scan-${repo.id}`
                });
                queuedCount++;
            }
            
            await updateWorkspaceSyncStatus(workspaceId, 'READY');
            logger.info(`[InstallationService] Sync complete for workspace ${workspaceId}. Queued ${queuedCount} baseline scans.`);
        } catch (error) {
            logger.error(`[InstallationService] Sync failed for workspace ${workspaceId}:`, error);
            try {
                await updateWorkspaceSyncStatus(workspaceId, 'FAILED');
            } catch (e) {
                logger.error(`[InstallationService] Failed to update sync status to FAILED for workspace ${workspaceId}`, e);
            }
        }
    }

    static async connect({ workspaceId, installationId, userId }) {
        // Deprecated, but keeping signature for now
        throw new ApiError(410, 'This endpoint is deprecated. Use callback flow.');
    }

    static async disconnect({ workspaceId, userId }) {
        const workspaceRole = await findUserWorkspaceRole(userId, workspaceId);

        if (workspaceRole !== 'OWNER') {
            throw new ApiError(403, 'Only workspace owners can disconnect GitHub.');
        }

        await disconnectWorkspaceGithubConnection({ workspaceId });
        return { success: true };
    }
}

export default InstallationService;
