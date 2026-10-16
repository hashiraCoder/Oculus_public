import { query } from '../../config/db.js';
import ApiError from '../../utils/apiError.js';
import { dispatchScan, SCAN_PRIORITY } from '../scheduler/scan-scheduler.js';
import { findUserWorkspaceRole } from '../../repositories/workspace.repository.js';

class ScanService {
    static async _verifyWorkspaceAccess(workspaceId, authContext) {
        if (!authContext) throw new ApiError(401, 'Authentication context missing');
        
        if (authContext.machineWorkspaceId) {
            if (authContext.machineWorkspaceId !== workspaceId) {
                throw new ApiError(403, 'Forbidden: Machine token does not have access to this workspace');
            }
            return true;
        }

        if (authContext.userId) {
            const role = await findUserWorkspaceRole(authContext.userId, workspaceId);
            if (!role) {
                throw new ApiError(403, 'Forbidden: User does not have access to this workspace');
            }
            return true;
        }

        throw new ApiError(401, 'Unauthorized');
    }

    static async getScanDetails(scanId, authContext) {
        const result = await query(`
            SELECT s.id, s.repository_id, s.pr_number, s.commit_hash, s.status, s.conclusion, s.triggered_by,
                   s.github_delivery_id, s.head_sha, s.started_at, s.finished_at, s.duration_ms,
                   s.total_files, s.total_findings, s.error_message, s.cancel_requested,
                   r.workspace_id
            FROM scans s
            JOIN repositories r ON s.repository_id = r.id
            WHERE s.id = $1
        `, [scanId]);

        if (result.rows.length === 0) {
            throw new ApiError(404, 'Scan not found');
        }

        const scan = result.rows[0];
        await this._verifyWorkspaceAccess(scan.workspace_id, authContext);
        
        // Remove workspace_id from payload before returning for contract purity
        delete scan.workspace_id;
        return scan;
    }

    static async getScanTimeline(scanId, authContext) {
        // First verify access via getScanDetails
        await this.getScanDetails(scanId, authContext);
        const result = await query(`
            SELECT id, event_type, payload, created_at as timestamp
            FROM scan_events
            WHERE scan_id = $1
            ORDER BY created_at ASC
        `, [scanId]);

        return result.rows;
    }

    static async getScanLogs(scanId, authContext) {
        await this.getScanDetails(scanId, authContext);
        const result = await query(`
            SELECT id, level, message, timestamp
            FROM scan_logs
            WHERE scan_id = $1
            ORDER BY timestamp ASC
        `, [scanId]);

        return result.rows;
    }

    static async getScanGateStatus(scanId, authContext) {
        const scan = await this.getScanDetails(scanId, authContext);

        let gateStatus = 'PENDING';
        let reason = 'Scan is still executing';

        if (scan.status === 'COMPLETED') {
            if (scan.conclusion === 'PASS') {
                gateStatus = 'PASSED';
                reason = 'Clean. No security thresholds exceeded.';
            } else if (scan.conclusion === 'FAIL') {
                gateStatus = 'FAILED';
                reason = 'Security threshold exceeded. Critical/High vulnerabilities found.';
            } else if (scan.conclusion === 'ERROR') {
                gateStatus = 'FAILED';
                reason = 'Scan failed to execute properly due to an error.';
            } else if (scan.conclusion === 'CANCELLED') {
                gateStatus = 'FAILED';
                reason = 'Scan was cancelled before completion.';
            }
        } else if (scan.status === 'PASSED') { // Legacy safety
            gateStatus = 'PASSED';
            reason = 'Clean. No security thresholds exceeded.';
        } else if (scan.status === 'FAILED') { // Legacy safety
            gateStatus = 'FAILED';
            reason = 'Security threshold exceeded. Critical/High vulnerabilities found.';
        } else if (scan.status === 'CANCELLED') { // Legacy safety
            gateStatus = 'FAILED';
            reason = 'Scan was cancelled before completion.';
        }

        return {
            execution: {
                status: scan.status,
                conclusion: scan.conclusion
            },
            gate: {
                status: gateStatus,
                reason: reason
            }
        };
    }

    static async cancelScan(scanId, authContext) {
        const scan = await this.getScanDetails(scanId, authContext);
        
        if (scan.status === 'PASSED' || scan.status === 'FAILED' || scan.status === 'COMPLETED' || scan.status === 'CANCELLED') {
            throw new ApiError(409, 'Cannot cancel a completed scan');
        }

        // 1. Mark cancel_requested in DB
        await query(`
            UPDATE scans
            SET cancel_requested = true
            WHERE id = $1
        `, [scanId]);

        // 2. If scan is still QUEUED, immediately cancel without waiting for worker
        if (scan.status === 'QUEUED') {
            try {
                const { scannerQueue } = await import('../../queues/scanner.queue.js');
                const waitingJobs = await scannerQueue.getJobs(['waiting', 'delayed', 'prioritized']);
                for (const job of waitingJobs) {
                    if (job.data?.scanId === scanId) {
                        await job.remove();
                        console.log(`[ScanService] Removed queued job ${job.id} for cancelled scan ${scanId}`);
                    }
                }
            } catch (queueErr) {
                console.warn('[ScanService] Error removing job from queue on cancel:', queueErr.message);
            }

            const { ScanLifecycle } = await import('../lifecycle/scan-lifecycle.js');
            await ScanLifecycle.transition(scanId, 'CANCELLED', { conclusion: 'CANCELLED' });

            try {
                const { default: NotificationService } = await import('../../notifications/notification.service.js');
                const repoRes = await query(`SELECT name FROM repositories WHERE id = $1`, [scan.repository_id]);
                const repoName = repoRes.rows[0]?.name || 'unknown';
                await NotificationService.publishScanFailed(scan.workspace_id, scan.repository_id, repoName, scanId, 'Scan cancelled by user.');
            } catch (notifErr) {}

            return true;
        }

        return true;
    }

    static async retryScan(scanId, authContext) {
        const scan = await this.getScanDetails(scanId, authContext);
        
        // Fetch repository details required for the job payload
        const repoRes = await query(`
            SELECT name, owner, installation_id, workspace_id
            FROM repositories WHERE id = $1
        `, [scan.repository_id]);
        
        if (repoRes.rows.length === 0) throw new ApiError(404, 'Repository not found');
        const repo = repoRes.rows[0];

        // Mark as queued again
        await query(`
            UPDATE scans
            SET status = 'QUEUED', cancel_requested = false, started_at = NOW(), finished_at = NULL, duration_ms = NULL, total_files = 0, total_findings = 0, error_message = NULL
            WHERE id = $1
        `, [scanId]);

        // Push to scheduler at P1 (developer-triggered retry — high priority)
        await dispatchScan({
            scanId: scan.id,
            installationId: repo.installation_id,
            workspaceId: repo.workspace_id,
            repositoryId: scan.repository_id,
            pullNumber: scan.pr_number,
            headSha: scan.head_sha,
            owner: repo.owner,
            repositoryName: repo.name,
            githubIdentityId: null, // Retries shouldn't double-count metrics
            priority: SCAN_PRIORITY.P1_HIGH,
            jobId: `retry-scan-${scan.id}-${Date.now()}`
        });

        return true;
    }

    static async triggerScan(repositoryId, commitSha = null, branch = null, triggerSource = 'api:manual', authContext = null, idempotencyKey = null) {
        const repoRes = await query(`
            SELECT name, owner, installation_id, workspace_id, default_branch
            FROM repositories WHERE id = $1
        `, [repositoryId]);
        
        if (repoRes.rows.length === 0) throw new ApiError(404, 'Repository not found');
        const repo = repoRes.rows[0];

        // SECURITY FIX: Verify workspace access before triggering
        await this._verifyWorkspaceAccess(repo.workspace_id, authContext);

        // IDEMPOTENCY FIX: Check Redis cache to prevent duplicate triggers
        let idempotencyRedisKey = null;
        if (idempotencyKey) {
            const callerId = authContext?.machineWorkspaceId ? `machine:${authContext.machineWorkspaceId}` : `user:${authContext?.userId}`;
            idempotencyRedisKey = `idempotency:scan:${callerId}:${idempotencyKey}`;
            
            // Need dynamic import or direct redis client since we only need it here
            const redis = (await import('../../config/redis.js')).default;
            const existingScanId = await redis.get(idempotencyRedisKey);
            if (existingScanId) {
                return { success: true, message: 'Scan queued successfully (Idempotent)', scanId: existingScanId };
            }
        }

        const targetBranch = branch || repo.default_branch;
        const targetCommit = commitSha || targetBranch; // If no sha provided, we'll scan the tip of the branch

        // Insert new scan and initial outbox event atomically
        const { getPool } = await import('../../config/db.js');
        const pool = getPool();
        const client = await pool.connect();
        let scanId;

        try {
            await client.query('BEGIN');

            const scanRes = await client.query(`
                INSERT INTO scans (
                    repository_id,
                    pr_number,
                    commit_hash,
                    status,
                    triggered_by,
                    trigger_source,
                    branch,
                    head_sha,
                    started_at
                ) VALUES ($1, NULL, $2, 'QUEUED', 'MANUAL', $3, $4, $2, NOW())
                RETURNING id
            `, [repositoryId, targetCommit, triggerSource, targetBranch]);

            scanId = scanRes.rows[0].id;

            // Insert scan_started event to Outbox in the SAME transaction
            await client.query(`
                INSERT INTO scan_events (scan_id, event_type, payload)
                VALUES ($1, 'scan_started', $2)
            `, [
                scanId,
                JSON.stringify({
                    installationId: repo.installation_id,
                    owner: repo.owner,
                    repo: repo.name,
                    headSha: targetCommit,
                    status: 'in_progress',
                    repositoryId,
                    workspaceId: repo.workspace_id
                })
            ]);

            await client.query('COMMIT');
        } catch (dbErr) {
            await client.query('ROLLBACK').catch(() => {});
            throw dbErr;
        } finally {
            client.release();
        }

        // Save idempotency key for 24 hours
        if (idempotencyRedisKey) {
            const redis = (await import('../../config/redis.js')).default;
            await redis.setex(idempotencyRedisKey, 86400, scanId); // 24h
        }

        // Push via ScanScheduler at P2 (manual/API triggered — normal priority)
        await dispatchScan({
            scanId,
            installationId: repo.installation_id,
            workspaceId: repo.workspace_id,
            repositoryId,
            owner: repo.owner,
            repositoryName: repo.name,
            headSha: targetCommit,
            branch: targetBranch,
            priority: SCAN_PRIORITY.P2_NORMAL
        });

        return { success: true, message: 'Scan queued successfully', scanId };
    }
}

export default ScanService;

