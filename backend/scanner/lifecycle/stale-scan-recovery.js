/**
 * scanner/lifecycle/stale-scan-recovery.js
 *
 * Background cron job that detects zombie scans (scans attached to dead workers).
 * If a worker's heartbeat is older than 2 minutes, the worker is considered dead
 * and its active jobs are marked as FAILED so they don't block the system.
 */
import { getPool } from '../../config/db.js';
import { ScanLifecycle } from './scan-lifecycle.js';

export class StaleScanRecovery {
    static async recoverZombies() {
        const pool = getPool();
        const TWO_MINUTES_MS = 2 * 60 * 1000;
        const cutoff = new Date(Date.now() - TWO_MINUTES_MS);

        try {
            // Find workers that haven't heartbeated in > 2 minutes and are not marked DEAD
            const deadWorkersRes = await pool.query(`
                SELECT worker_id, metadata 
                FROM worker_leases 
                WHERE last_heartbeat_at < $1 AND status != 'DEAD'
            `, [cutoff]);

            for (const worker of deadWorkersRes.rows) {
                console.warn(`[StaleScanRecovery] Detected dead worker: ${worker.worker_id}`);

                // Mark worker as DEAD
                await pool.query(`UPDATE worker_leases SET status = 'DEAD', active_jobs = 0 WHERE worker_id = $1`, [worker.worker_id]);

                // Emit alert
                await pool.query(`
                    INSERT INTO engine_alerts (alert_type, severity, message, context)
                    VALUES ($1, $2, $3, $4)
                `, [
                    'WORKER_CRASH',
                    'CRITICAL',
                    `Worker ${worker.worker_id} missed heartbeat and is presumed dead.`,
                    worker.metadata
                ]);

                // Recover associated scans if we know them from metadata
                const activeScans = worker.metadata?.activeScanIds || [];
                for (const scanId of activeScans) {
                    console.warn(`[StaleScanRecovery] Failing zombie scan: ${scanId}`);
                    
                    // Check current state just in case it actually finished
                    const scanRes = await pool.query(`SELECT status FROM scans WHERE id = $1`, [scanId]);
                    const status = scanRes.rows[0]?.status;
                    
                    if (status && !['COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT'].includes(status)) {
                        await ScanLifecycle.transition(scanId, 'FAILED', {
                            conclusion: 'ERROR',
                            errorDetails: 'Worker crashed or hung during execution.'
                        });
                    }
                }
            }

            // Also check for orphaned in-flight scans without active leases running for > 10 minutes
            // or QUEUED scans abandoned > 10 minutes without pickup
            const orphanedScansRes = await pool.query(`
                SELECT id FROM scans 
                WHERE (
                    (status IN ('DISPATCHED', 'ACQUIRING_SOURCE', 'ANALYZING', 'PERSISTING') AND started_at < NOW() - INTERVAL '10 minutes')
                    OR (status = 'QUEUED' AND created_at < NOW() - INTERVAL '10 minutes')
                )
            `);
            for (const row of orphanedScansRes.rows) {
                console.warn(`[StaleScanRecovery] Failing orphaned scan: ${row.id}`);
                await ScanLifecycle.transition(row.id, 'FAILED', {
                    conclusion: 'ERROR',
                    errorDetails: 'Scan abandoned: execution timed out with no active worker heartbeat.'
                });
            }
        } catch (error) {
            console.error(`[StaleScanRecovery Error] Failed to run recovery:`, error);
        }
    }
}

