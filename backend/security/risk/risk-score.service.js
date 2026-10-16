import { getPool } from '../../config/db.js';
import NotificationService from '../../notifications/notification.service.js';
import logger from '../../config/logger.js';

class RiskScoreService {
    static calculateRiskScore(counts) {
        const { critical = 0, high = 0, medium = 0, low = 0 } = counts;
        
        // Standard default risk weights
        const weights = {
            critical: 40,
            high: 20,
            medium: 5,
            low: 1
        };

        const factors = {
            criticalFindings: critical * weights.critical,
            highFindings: high * weights.high,
            mediumFindings: medium * weights.medium,
            lowFindings: low * weights.low
        };

        let riskDeduction = factors.criticalFindings + factors.highFindings + factors.mediumFindings + factors.lowFindings;
        
        // Base score is 100 (perfect). We deduct based on findings. Minimum score is 0.
        const score = Math.max(0, 100 - riskDeduction);

        let grade = 'A';
        let level = 'LOW';

        if (score < 50) {
            grade = 'F';
            level = 'CRITICAL';
        } else if (score < 70) {
            grade = 'D';
            level = 'HIGH';
        } else if (score < 80) {
            grade = 'C';
            level = 'MEDIUM';
        } else if (score < 90) {
            grade = 'B';
            level = 'LOW';
        }

        return { score, grade, level, factors };
    }

    /**
     * Recalculates the risk for a given repository by querying all OPEN vulnerabilities.
     * Updates the repository record and creates a historical snapshot.
     */
    static async updateRepositoryRisk(repositoryId, workspaceId) {
        const pool = getPool();
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // 0. Fetch configured risk_policies
            const policyRes = await client.query(`
                SELECT config FROM risk_policies
                WHERE workspace_id = $1 AND policy_type = 'risk_weights'
            `, [workspaceId]);

            let weights = { critical: 40, high: 20, medium: 5, low: 1 };
            if (policyRes.rows.length > 0) {
                weights = { ...weights, ...policyRes.rows[0].config };
            }

            // 1. Aggregate current OPEN vulnerabilities
            const res = await client.query(`
                SELECT severity, COUNT(*) as count
                FROM vulnerabilities v
                JOIN scans s ON v.scan_id = s.id
                WHERE s.repository_id = $1 AND v.status = 'OPEN'
                GROUP BY severity
            `, [repositoryId]);

            const counts = { critical: 0, high: 0, medium: 0, low: 0 };
            for (const row of res.rows) {
                const sev = row.severity.toLowerCase();
                if (counts[sev] !== undefined) {
                    counts[sev] = parseInt(row.count, 10);
                }
            }

            // 2. Calculate new risk profile using dynamic weights
            const factors = {
                criticalFindings: counts.critical * weights.critical,
                highFindings: counts.high * weights.high,
                mediumFindings: counts.medium * weights.medium,
                lowFindings: counts.low * weights.low
            };

            const riskDeduction = factors.criticalFindings + factors.highFindings + factors.mediumFindings + factors.lowFindings;
            const score = Math.max(0, 100 - riskDeduction);

            let grade = 'A';
            let level = 'LOW';
            if (score < 50) { grade = 'F'; level = 'CRITICAL'; }
            else if (score < 70) { grade = 'D'; level = 'HIGH'; }
            else if (score < 80) { grade = 'C'; level = 'MEDIUM'; }
            else if (score < 90) { grade = 'B'; level = 'LOW'; }

            // 3. Insert Risk Snapshot
            await client.query(`
                INSERT INTO repository_risk_snapshots 
                (repository_id, risk_score, risk_grade, risk_level, critical_count, high_count, medium_count, low_count, risk_factors)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                repositoryId, score, grade, level, 
                counts.critical, counts.high, counts.medium, counts.low, 
                JSON.stringify(factors)
            ]);

            // 4. Update Repository
            await client.query(`
                UPDATE repositories
                SET current_risk_score = $2, current_risk_grade = $3, current_risk_level = $4
                WHERE id = $1
            `, [repositoryId, score, grade, level]);

            await client.query('COMMIT');

            // 5. Publish WS events (fine-grained)
            try {
                const { default: SocketPublisher } = await import('../../notifications/socket.publisher.js');
                
                // Fine-grained repository risk update
                await SocketPublisher.publish('oculus-notifications', {
                    room: `workspace:${workspaceId}`,
                    event: 'repository.updated',
                    data: { repositoryId, score, grade, level, counts, timestamp: Date.now() }
                });

                // Dashboard summary update hook
                await SocketPublisher.publish('oculus-notifications', {
                    room: `workspace:${workspaceId}`,
                    event: 'dashboard.summary.updated',
                    data: { timestamp: Date.now() }
                });

            } catch (pubErr) {
                logger.error(`[RiskScoreService] Failed to publish WS events`, pubErr);
            }

            return { score, grade, level, counts, factors };

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error(`[RiskScoreService] Failed to update risk for repository ${repositoryId}`, error);
            throw error;
        } finally {
            client.release();
        }
    }
}

export default RiskScoreService;
