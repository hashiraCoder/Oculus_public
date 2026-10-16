import { getPool } from '../../config/db.js';
import logger from '../../config/logger.js';

class AnalyticsAggregatorService {
    static async updateWorkspaceSnapshot(workspaceId) {
        const pool = getPool();
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // 1. Calculate Risk Score from Repository Snapshots (Avg)
            const repoRes = await client.query(`
                SELECT COALESCE(AVG(current_risk_score), 100) as avg_risk_score
                FROM repositories 
                WHERE workspace_id = $1 AND current_risk_score IS NOT NULL
            `, [workspaceId]);
            const riskScore = Math.round(parseFloat(repoRes.rows[0].avg_risk_score));

            // 2. Exact, Idempotent Vulnerability & Scan Aggregation
            await client.query(`
                INSERT INTO dashboard_snapshots (
                    workspace_id, risk_score, critical_count, high_count, medium_count, low_count,
                    open_findings, fixed_findings, repositories_scanned, last_scan_at, updated_at
                )
                SELECT 
                    $1 as workspace_id,
                    $2 as risk_score,
                    COUNT(CASE WHEN v.status = 'OPEN' AND v.severity = 'CRITICAL' THEN 1 END) as critical_count,
                    COUNT(CASE WHEN v.status = 'OPEN' AND v.severity = 'HIGH' THEN 1 END) as high_count,
                    COUNT(CASE WHEN v.status = 'OPEN' AND v.severity = 'MEDIUM' THEN 1 END) as medium_count,
                    COUNT(CASE WHEN v.status = 'OPEN' AND v.severity = 'LOW' THEN 1 END) as low_count,
                    COUNT(CASE WHEN v.status = 'OPEN' THEN 1 END) as open_findings,
                    COUNT(CASE WHEN v.status = 'FIXED' THEN 1 END) as fixed_findings,
                    (SELECT COUNT(DISTINCT s2.repository_id) FROM scans s2 JOIN repositories r2 ON s2.repository_id = r2.id WHERE r2.workspace_id = $1) as repositories_scanned,
                    (SELECT MAX(s2.created_at) FROM scans s2 JOIN repositories r2 ON s2.repository_id = r2.id WHERE r2.workspace_id = $1) as last_scan_at,
                    NOW() as updated_at
                FROM vulnerabilities v
                JOIN scans s ON v.scan_id = s.id
                JOIN repositories r ON s.repository_id = r.id
                WHERE r.workspace_id = $1
                ON CONFLICT (workspace_id)
                DO UPDATE SET
                    risk_score = EXCLUDED.risk_score,
                    critical_count = EXCLUDED.critical_count,
                    high_count = EXCLUDED.high_count,
                    medium_count = EXCLUDED.medium_count,
                    low_count = EXCLUDED.low_count,
                    open_findings = EXCLUDED.open_findings,
                    fixed_findings = EXCLUDED.fixed_findings,
                    repositories_scanned = EXCLUDED.repositories_scanned,
                    last_scan_at = EXCLUDED.last_scan_at,
                    updated_at = NOW();
            `, [workspaceId, riskScore]);

            await client.query('COMMIT');
            
            // 3. Purge stale in-memory cache (after DB commit)
            try {
                const { invalidateCache } = await import('./analytics.service.js');
                invalidateCache(workspaceId);
            } catch (cacheErr) {
                logger.warn(`[AnalyticsAggregator] Failed to invalidate cache for workspace ${workspaceId}: ${cacheErr.message}`);
            }
            
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error(`[AnalyticsAggregator] Failed to update snapshot for ${workspaceId}`, error);
        } finally {
            client.release();
        }
    }
}

export default AnalyticsAggregatorService;
