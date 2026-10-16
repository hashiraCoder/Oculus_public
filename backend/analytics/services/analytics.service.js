import { getPool } from '../../config/db.js';
import logger from '../../config/logger.js';

// Simple in-memory cache to replace Redis for single-instance deployment
const memoryCache = new Map();

const getFromCache = (key) => {
    const item = memoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
        memoryCache.delete(key);
        return null;
    }
    return item.data;
};

const setInCache = (key, data, ttlSeconds) => {
    memoryCache.set(key, {
        data,
        expiresAt: Date.now() + (ttlSeconds * 1000)
    });
};

export const invalidateCache = (workspaceId) => {
    memoryCache.delete(`analytics:posture:${workspaceId}`);
    memoryCache.delete(`analytics:summary:${workspaceId}`);
};

class AnalyticsService {
    static async getSecurityPosture(workspaceId) {
        const cacheKey = `analytics:posture:${workspaceId}`;
        const cached = getFromCache(cacheKey);
        if (cached) return cached;

        const pool = getPool();
        
        // Fetch from materialized snapshots
        const res = await pool.query(`SELECT * FROM dashboard_snapshots WHERE workspace_id = $1`, [workspaceId]);
        const stats = res.rows[0] || {};
        const riskScore = parseInt(stats.risk_score) || 100;
        
        let securityGrade = 'A';
        if (riskScore < 50) securityGrade = 'F';
        else if (riskScore < 70) securityGrade = 'D';
        else if (riskScore < 80) securityGrade = 'C';
        else if (riskScore < 90) securityGrade = 'B';

        const prBlockRes = await pool.query(`
            SELECT COUNT(*) as count
            FROM scans s
            JOIN repositories r ON s.repository_id = r.id
            WHERE r.workspace_id = $1 AND s.status = 'FAILED' AND s.created_at >= NOW() - INTERVAL '7 days'
        `, [workspaceId]);

        // Compliance % mockup (based on policies passed vs total, just proxying by Grade for now)
        const compliancePercentage = Math.min(100, Math.max(0, riskScore));

        const data = {
            securityGrade,
            riskScore,
            trend: 'stable', 
            criticalIssues: parseInt(stats.critical_count) || 0,
            openFindings: parseInt(stats.open_findings) || 0,
            blockedPRs: parseInt(prBlockRes.rows[0].count, 10),
            repositoryCoverage: parseInt(stats.repositories_scanned) || 0,
            repositoriesProtected: parseInt(stats.repositories_scanned) || 0,
            lastScan: stats.last_scan_at || null,
            averageFixTime: '2 days', // Can aggregate from vulnerability_audits later
            compliancePercentage,
            secretExposure: parseInt(stats.critical_count) > 0 ? 'HIGH' : 'LOW'
        };

        setInCache(cacheKey, data, 30);
        return data;
    }

    static async getWorkspaceSummary(workspaceId) {
        const cacheKey = `analytics:summary:${workspaceId}`;
        const cached = getFromCache(cacheKey);
        if (cached) return cached;

        const pool = getPool();
        
        // Use materialized view instead of aggregating on the fly
        const snapRes = await pool.query(`SELECT * FROM dashboard_snapshots WHERE workspace_id = $1`, [workspaceId]);
        const snap = snapRes.rows[0] || {};
        
        const repoRes = await pool.query(`SELECT COUNT(*) as count FROM repositories WHERE workspace_id = $1`, [workspaceId]);
        const devRes = await pool.query(`SELECT COUNT(*) as count FROM github_developer_identities WHERE workspace_id = $1`, [workspaceId]);

        const data = {
            totalRepositories: parseInt(repoRes.rows[0].count, 10),
            totalScans: 0, // Should probably come from snapshots if we add it
            activeScans: 0, 
            openFindings: parseInt(snap.open_findings) || 0,
            criticalFindings: parseInt(snap.critical_count) || 0,
            highFindings: parseInt(snap.high_count) || 0,
            averageScanDuration: 0,
            totalDevelopers: parseInt(devRes.rows[0].count, 10)
        };

        setInCache(cacheKey, data, 30);
        return data;
    }

    static async getRiskTrend(workspaceId, days = 30) {
        const pool = getPool();
        const res = await pool.query(`
            SELECT date_trunc('day', rs.created_at) as day, AVG(rs.risk_score) as avg_risk
            FROM repository_risk_snapshots rs
            JOIN repositories r ON rs.repository_id = r.id
            WHERE r.workspace_id = $1 AND rs.created_at >= NOW() - INTERVAL '${parseInt(days)} days'
            GROUP BY day
            ORDER BY day ASC
        `, [workspaceId]);

        return res.rows.map(row => ({
            date: row.day,
            averageRisk: Math.round(parseFloat(row.avg_risk))
        }));
    }

    static async getFindingDistribution(workspaceId) {
        const pool = getPool();
        const res = await pool.query(`
            SELECT rule_type, COUNT(*) as count
            FROM vulnerabilities v
            JOIN scans s ON v.scan_id = s.id
            JOIN repositories r ON s.repository_id = r.id
            WHERE r.workspace_id = $1 AND v.status = 'OPEN'
            GROUP BY rule_type
            ORDER BY count DESC
            LIMIT 10
        `, [workspaceId]);

        return res.rows.map(row => ({
            rule: row.rule_type,
            count: parseInt(row.count, 10)
        }));
    }

    static async getRepositoryRanking(workspaceId) {
        const pool = getPool();
        
        // Most Vulnerable (lowest risk score)
        const mostVulnerable = await pool.query(`
            SELECT id, name, current_risk_score, current_risk_grade
            FROM repositories
            WHERE workspace_id = $1 AND current_risk_score IS NOT NULL
            ORDER BY current_risk_score ASC
            LIMIT 5
        `, [workspaceId]);

        // Most Secure (highest risk score)
        const mostSecure = await pool.query(`
            SELECT id, name, current_risk_score, current_risk_grade
            FROM repositories
            WHERE workspace_id = $1 AND current_risk_score IS NOT NULL
            ORDER BY current_risk_score DESC
            LIMIT 5
        `, [workspaceId]);

        return {
            mostVulnerable: mostVulnerable.rows,
            mostSecure: mostSecure.rows
        };
    }
}

export default AnalyticsService;
