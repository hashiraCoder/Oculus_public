import { buildCursorPagination, normalizeCursorLimit } from '../pagination/index.js';
import { query } from '../config/db.js';

class ScanRepository {
    static async listByRepository({ repositoryId, cursor = null, limit = 50 }) {
        const normalizedLimit = normalizeCursorLimit(limit);
        const params = [repositoryId];
        const whereClauses = ['repository_id = $1'];

        if (cursor?.created_at !== undefined && cursor?.id !== undefined) {
            whereClauses.push('(created_at < $2 OR (created_at = $2 AND id < $3))');
            params.push(cursor.created_at, cursor.id);
        } else if (cursor?.created_at !== undefined) {
            whereClauses.push('created_at < $2');
            params.push(cursor.created_at);
        }

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const result = await query(`
            SELECT id, repository_id, pr_number, commit_hash, status,
                   started_at, finished_at, total_files, total_findings, created_at
            FROM scans
            ${whereClause}
            ORDER BY created_at DESC, id DESC
            LIMIT $${params.length + 1}
        `, [...params, normalizedLimit + 1]);

        const items = result.rows;
        const hasMore = items.length > normalizedLimit;
        const pagedItems = hasMore ? items.slice(0, normalizedLimit) : items;

        return buildCursorPagination({
            items: pagedItems,
            limit: normalizedLimit,
            hasMore,
            cursorKey: 'created_at',
        });
    }
}

export const createGithubScan = async ({
    repositoryId,
    prNumber = null,
    commitHash,
    githubDeliveryId = null,
    headSha = null,
    triggeredBy = 'WEBHOOK',
    triggerSource = null,
    branch = null,
    githubIdentityId = null,
    workspaceId = null,
    outboxEvent = null
}) => {
    const { getPool } = await import('../config/db.js');
    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `WITH scan_upsert AS (
                INSERT INTO scans (
                    repository_id,
                    pr_number,
                    commit_hash,
                    status,
                    triggered_by,
                    trigger_source,
                    branch,
                    github_delivery_id,
                    head_sha,
                    started_at
                ) VALUES ($1, $2, $3, 'QUEUED', $4, $5, $6, $7, $8, NOW())
                ON CONFLICT (github_delivery_id)
                DO UPDATE SET
                    pr_number = EXCLUDED.pr_number,
                    commit_hash = EXCLUDED.commit_hash,
                    head_sha = EXCLUDED.head_sha,
                    trigger_source = EXCLUDED.trigger_source,
                    branch = EXCLUDED.branch,
                    status = 'QUEUED',
                    started_at = COALESCE(scans.started_at, NOW())
                RETURNING *, (xmax = 0) AS is_new_insert
            )
            SELECT * FROM scan_upsert`,
            [repositoryId, prNumber, commitHash, triggeredBy, triggerSource, branch, githubDeliveryId, headSha]
        );

        const scanRow = result.rows[0] || null;

        if (scanRow && scanRow.is_new_insert) {
            // 1. Transactionally write initial outbox event if provided
            if (outboxEvent) {
                await client.query(`
                    INSERT INTO scan_events (scan_id, event_type, payload)
                    VALUES ($1, $2, $3)
                `, [scanRow.id, outboxEvent.eventType || 'scan_started', JSON.stringify(outboxEvent.payload || {})]);
            }

            // 2. Atomically increment developer metric if applicable
            if (githubIdentityId && workspaceId) {
                await client.query(`
                    INSERT INTO workspace_developer_metrics (github_identity_id, workspace_id, scans_triggered)
                    VALUES ($1, $2, 1)
                    ON CONFLICT (github_identity_id)
                    DO UPDATE SET 
                        scans_triggered = workspace_developer_metrics.scans_triggered + 1,
                        updated_at = NOW()
                `, [githubIdentityId, workspaceId]);
            }
        }

        await client.query('COMMIT');
        return scanRow;
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
    } finally {
        client.release();
    }
};

export const markGithubScanCompleted = async ({ scanId, status = 'PASSED', durationMs = null }) => {
    const result = await query(
        `UPDATE scans
         SET status = $2,
             finished_at = NOW(),
             duration_ms = COALESCE($3, EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000)
         WHERE id = $1
         RETURNING id, repository_id, status, finished_at, duration_ms`,
        [scanId, status, durationMs]
    );

    return result.rows[0] || null;
};

export const markGithubScanFailed = async ({ scanId, durationMs = null }) => {
    const result = await query(
        `UPDATE scans
         SET status = 'FAILED',
             finished_at = NOW(),
             duration_ms = COALESCE($2, EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000)
         WHERE id = $1
         RETURNING id, repository_id, status, finished_at, duration_ms`,
        [scanId, durationMs]
    );

    return result.rows[0] || null;
};

export default ScanRepository;
