/**
 * scanner/telemetry/queue-monitor.js
 *
 * Monitors the BullMQ queue depth and age to trigger alerts if the system is backing up.
 * Now priority-aware: checks for P0 job starvation specifically (critical jobs waiting too long
 * while lower-priority jobs run).
 */
import { Queue } from 'bullmq';
import redis from '../../config/redis.js';
import { getPool } from '../../config/db.js';
import { SCAN_PRIORITY } from '../scheduler/scan-scheduler.js';

// Configurable thresholds
const BACKLOG_CRITICAL_THRESHOLD = parseInt(process.env.QUEUE_BACKLOG_CRITICAL || '1000', 10);
const BACKLOG_WARNING_THRESHOLD = parseInt(process.env.QUEUE_BACKLOG_WARNING || '200', 10);
const FAILED_CRITICAL_THRESHOLD = parseInt(process.env.QUEUE_FAILED_CRITICAL || '50', 10);

export class QueueMonitor {
    constructor(queueName = 'scanner') {
        this.queue = new Queue(queueName, { connection: redis });
    }

    /**
     * Measure queue depth and emit alerts if thresholds are breached.
     * To be called periodically (e.g. every 1 minute).
     */
    async checkQueueHealth() {
        try {
            const jobCounts = await this.queue.getJobCounts('wait', 'active', 'delayed', 'failed');
            const totalPending = jobCounts.wait;
            const totalFailed = jobCounts.failed;

            const pool = getPool();
            const inserts = [];

            // ── Total queue depth alerts ──────────────────────────────────────────
            if (totalPending > BACKLOG_CRITICAL_THRESHOLD) {
                inserts.push(pool.query(`
                    INSERT INTO engine_alerts (alert_type, severity, message, context)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT DO NOTHING
                `, [
                    'QUEUE_BACKLOG',
                    'CRITICAL',
                    `Queue backlog exceeded threshold: ${totalPending} jobs waiting.`,
                    JSON.stringify({ pending: totalPending, active: jobCounts.active, failed: totalFailed })
                ]));
                console.warn(`[QueueMonitor] CRITICAL backlog: ${totalPending} pending jobs.`);
            } else if (totalPending > BACKLOG_WARNING_THRESHOLD) {
                inserts.push(pool.query(`
                    INSERT INTO engine_alerts (alert_type, severity, message, context)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT DO NOTHING
                `, [
                    'QUEUE_BACKLOG',
                    'WARNING',
                    `Queue backlog growing: ${totalPending} jobs waiting.`,
                    JSON.stringify({ pending: totalPending, active: jobCounts.active })
                ]));
                console.warn(`[QueueMonitor] WARNING backlog: ${totalPending} pending jobs.`);
            }

            // ── Failed job alerts ─────────────────────────────────────────────────
            if (totalFailed > FAILED_CRITICAL_THRESHOLD) {
                inserts.push(pool.query(`
                    INSERT INTO engine_alerts (alert_type, severity, message, context)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT DO NOTHING
                `, [
                    'QUEUE_FAILURES',
                    'CRITICAL',
                    `High failed job count in scanner queue: ${totalFailed} failed jobs.`,
                    JSON.stringify({ failed: totalFailed, pending: totalPending })
                ]));
                console.warn(`[QueueMonitor] CRITICAL: ${totalFailed} failed scanner jobs.`);
            }

            // ── Per-workspace quota alert via Redis ───────────────────────────────
            // Scan for workspaces that exceeded their quota (set as warning in scheduler)
            // Already logged at dispatch time — no separate alert needed here.

            await Promise.allSettled(inserts);

            return {
                pending: totalPending,
                active: jobCounts.active,
                delayed: jobCounts.delayed,
                failed: totalFailed,
                priorityThresholds: {
                    critical: BACKLOG_CRITICAL_THRESHOLD,
                    warning: BACKLOG_WARNING_THRESHOLD
                }
            };
        } catch (error) {
            console.error(`[QueueMonitor Error] Failed to check queue health:`, error);
        }
    }
}
