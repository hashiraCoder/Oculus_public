import { getPool } from '../../config/db.js';
import NotificationService from '../../notifications/notification.service.js';
import logger from '../../config/logger.js';
import { decrypt } from '../../scanner/utils/encryption.js';

class FindingsService {
    static async getFindings(workspaceId, { repositoryId, severity, status, rule, branch, prNumber, filePath, keyword, fromDate, toDate, cursor, limit = 20 }) {
        const pool = getPool();

        let query = `
                SELECT v.id, v.rule_type, v.engine, v.severity, v.file_path, v.line_number, v.fingerprint,
                     v.encrypted_snippet, v.confidence_score, v.introduced_by_github_identity_id,
                     g.github_username as introduced_by,
                     v.status, v.created_at, r.name as repo_name, r.id as repo_id,
                   CASE severity
                       WHEN 'CRITICAL' THEN 4
                       WHEN 'HIGH' THEN 3
                       WHEN 'MEDIUM' THEN 2
                       WHEN 'LOW' THEN 1
                       ELSE 0
                   END as severity_rank
            FROM vulnerabilities v
            JOIN scans s ON v.scan_id = s.id
            JOIN repositories r ON s.repository_id = r.id
            LEFT JOIN github_developer_identities g ON g.id = v.introduced_by_github_identity_id
            WHERE r.workspace_id = $1
        `;
        
        const values = [workspaceId];

        if (repositoryId) {
            values.push(repositoryId);
            query += ` AND s.repository_id = $${values.length}`;
        }
        if (severity) {
            values.push(Array.isArray(severity) ? severity : [severity]);
            query += ` AND v.severity = ANY($${values.length}::text[])`;
        }
        if (status) {
            values.push(Array.isArray(status) ? status : [status]);
            query += ` AND v.status = ANY($${values.length}::text[])`;
        }
        if (rule) {
            values.push(rule);
            query += ` AND v.rule_type = $${values.length}`;
        }
        if (branch) {
            values.push(branch);
            query += ` AND s.head_sha = $${values.length}`; // Simplified mapping for branch/sha
        }
        if (prNumber) {
            values.push(parseInt(prNumber, 10));
            query += ` AND s.pr_number = $${values.length}`;
        }
        if (filePath) {
            values.push(`%${filePath}%`);
            query += ` AND v.file_path ILIKE $${values.length}`;
        }
        if (keyword) {
            values.push(`%${keyword}%`);
            query += ` AND (v.rule_type ILIKE $${values.length} OR v.file_path ILIKE $${values.length})`;
        }
        if (fromDate) {
            values.push(fromDate);
            query += ` AND v.created_at >= $${values.length}`;
        }
        if (toDate) {
            values.push(toDate);
            query += ` AND v.created_at <= $${values.length}`;
        }

        // Composite Cursor
        if (cursor) {
            try {
                const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
                // Sort order: severity_rank DESC, created_at DESC, id DESC
                // v.severity_rank < decoded.rank OR (v.severity_rank = decoded.rank AND v.created_at < decoded.time) OR (v.severity_rank = decoded.rank AND v.created_at = decoded.time AND v.id < decoded.id)
                // In Postgres, row value comparison works nicely: (severity_rank, created_at, id) < (val1, val2, val3)
                values.push(decoded.severity_rank, decoded.created_at, decoded.id);
                const rankIdx = values.length - 2;
                const timeIdx = values.length - 1;
                const idIdx = values.length;
                
                query += ` AND (
                    CASE severity
                       WHEN 'CRITICAL' THEN 4
                       WHEN 'HIGH' THEN 3
                       WHEN 'MEDIUM' THEN 2
                       WHEN 'LOW' THEN 1
                       ELSE 0
                   END, 
                   v.created_at, 
                   v.id
                ) < ($${rankIdx}, $${timeIdx}, $${idIdx})`;
            } catch (e) {
                // Ignore invalid cursor
            }
        }

        values.push(parseInt(limit, 10) + 1);
        query += ` ORDER BY severity_rank DESC, v.created_at DESC, v.id DESC LIMIT $${values.length}`;

        const { rows } = await pool.query(query, values);

        let nextCursor = null;
        if (rows.length > limit) {
            const nextItem = rows.pop();
            nextCursor = Buffer.from(JSON.stringify({
                severity_rank: nextItem.severity_rank,
                created_at: nextItem.created_at,
                id: nextItem.id
            })).toString('base64');
        }

        return {
            items: rows.map(({ encrypted_snippet, ...row }) => ({
                ...row,
                snippet: decrypt(encrypted_snippet),
            })),
            nextCursor,
        };
    }

    static async getFingerprintHistory(workspaceId, fingerprint) {
        const pool = getPool();
        const { rows } = await pool.query(`
            SELECT v.id, v.status, v.created_at, v.severity, s.id as scan_id, s.pr_number, s.commit_hash, r.name as repo_name
            FROM vulnerabilities v
            JOIN scans s ON v.scan_id = s.id
            JOIN repositories r ON s.repository_id = r.id
            WHERE r.workspace_id = $1 AND v.fingerprint = $2
            ORDER BY v.created_at DESC
        `, [workspaceId, fingerprint]);

        return rows;
    }

    static async updateFindingStatus(workspaceId, findingId, newStatus, comment, userId, skipAggregation = false) {
        const pool = getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const vulnRes = await client.query(`
                SELECT v.status, s.repository_id
                FROM vulnerabilities v
                JOIN scans s ON v.scan_id = s.id
                JOIN repositories r ON s.repository_id = r.id
                WHERE v.id = $1 AND r.workspace_id = $2
                FOR UPDATE
            `, [findingId, workspaceId]);

            if (vulnRes.rows.length === 0) {
                throw new Error('Finding not found');
            }

            const oldStatus = vulnRes.rows[0].status;
            const repositoryId = vulnRes.rows[0].repository_id;

            if (oldStatus !== newStatus) {
                const resolved = ['FIXED', 'FALSE_POSITIVE', 'IGNORED'].includes(newStatus);
                const isFalsePositive = newStatus === 'FALSE_POSITIVE';

                await client.query(`
                    UPDATE vulnerabilities
                    SET status = $1,
                        resolved = $2,
                        is_false_positive = $3
                    WHERE id = $4
                `, [newStatus, resolved, isFalsePositive, findingId]);

                await client.query(`
                    INSERT INTO vulnerability_audits (vulnerability_id, old_status, new_status, comment, changed_by)
                    VALUES ($1, $2, $3, $4, $5)
                `, [findingId, oldStatus, newStatus, comment || null, userId || null]);
            }

            await client.query('COMMIT');

            // Trigger Risk recalculation (which publishes WS event)
            const { default: RiskScoreService } = await import('../../security/risk/risk-score.service.js');
            await RiskScoreService.updateRepositoryRisk(repositoryId, workspaceId);

            // Publish fine-grained finding.updated event
            try {
                const { default: SocketPublisher } = await import('../../notifications/socket.publisher.js');
                await SocketPublisher.publish('oculus-notifications', {
                    room: `workspace:${workspaceId}`,
                    event: 'finding.updated',
                    data: { findingId, status: newStatus, timestamp: Date.now() }
                });
            } catch (pubErr) {
                logger.error(`[FindingsService] Failed to publish finding.updated WS event`, pubErr);
            }

            if (!skipAggregation) {
                try {
                    const { default: AnalyticsAggregatorService } = await import('../../analytics/services/analytics-aggregator.service.js');
                    await AnalyticsAggregatorService.updateWorkspaceSnapshot(workspaceId);
                } catch (aggErr) {
                    logger.error(`[FindingsService] Failed to update workspace snapshot`, aggErr);
                }
            }

            return { success: true };

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error(`[FindingsService] Failed to update finding status`, error);
            throw error;
        } finally {
            client.release();
        }
    }

    static async getFindingAudit(workspaceId, findingId) {
        const pool = getPool();
        const { rows } = await pool.query(`
            SELECT a.id, a.old_status, a.new_status, a.comment, a.created_at, u.email as changed_by_email
            FROM vulnerability_audits a
            JOIN vulnerabilities v ON a.vulnerability_id = v.id
            JOIN scans s ON v.scan_id = s.id
            JOIN repositories r ON s.repository_id = r.id
            LEFT JOIN users u ON a.changed_by = u.id
            WHERE r.workspace_id = $1 AND a.vulnerability_id = $2
            ORDER BY a.created_at DESC
        `, [workspaceId, findingId]);

        return rows;
    }

    static async bulkUpdateFindingStatus(workspaceId, findingIds, newStatus, comment, userId) {
        // Iterate through all and update, skipping individual aggregation
        for (const findingId of findingIds) {
            await FindingsService.updateFindingStatus(workspaceId, findingId, newStatus, comment, userId, true);
        }
        
        // Trigger one bulk aggregation
        try {
            const { default: AnalyticsAggregatorService } = await import('../../analytics/services/analytics-aggregator.service.js');
            await AnalyticsAggregatorService.updateWorkspaceSnapshot(workspaceId);
        } catch (aggErr) {
            logger.error(`[FindingsService] Failed to update workspace snapshot after bulk update`, aggErr);
        }
        
        return { success: true };
    }
}

export default FindingsService;
