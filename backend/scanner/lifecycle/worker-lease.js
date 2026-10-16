/**
 * scanner/lifecycle/worker-lease.js
 *
 * Heartbeat and lease management for BullMQ workers.
 * Ensures the Engine Control Center knows which workers are alive and what they are doing.
 */
import { getPool } from '../../config/db.js';
import os from 'os';
import crypto from 'crypto';

export class WorkerLease {
    constructor(workerType, concurrencyLimit) {
        // Unique ID per worker process instance
        this.workerId = `${workerType}-${os.hostname()}-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
        this.hostname = os.hostname();
        this.pid = process.pid;
        this.concurrencyLimit = concurrencyLimit;
        
        this.activeJobs = new Set();
        this.heartbeatInterval = null;
    }

    /**
     * Start the worker lease heartbeat.
     * Upserts the worker record every 15 seconds.
     */
    async start() {
        await this._heartbeat();
        this.heartbeatInterval = setInterval(() => this._heartbeat(), 15000);
        console.log(`[WorkerLease] Started heartbeat for worker ${this.workerId}`);
    }

    /**
     * Stop the worker lease heartbeat and mark the worker as DEAD.
     */
    async stop() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        try {
            const pool = getPool();
            await pool.query(
                `UPDATE worker_leases SET status = 'DEAD', active_jobs = 0 WHERE worker_id = $1`,
                [this.workerId]
            );
        } catch (error) {
            console.error(`[WorkerLease Error] Failed to mark worker ${this.workerId} DEAD:`, error);
        }
    }

    /**
     * Register a scan job as actively processing on this worker.
     * @param {string} scanId 
     */
    async addJob(scanId) {
        this.activeJobs.add(scanId);
        await this._heartbeat();
    }

    /**
     * Remove a scan job when it completes or fails.
     * @param {string} scanId 
     */
    async removeJob(scanId) {
        this.activeJobs.delete(scanId);
        await this._heartbeat();
    }

    async _heartbeat() {
        try {
            const pool = getPool();
            const status = this.activeJobs.size > 0 ? 'BUSY' : 'IDLE';
            
            // Note: worker_leases table has one row per worker, but we can only associate one scan_id
            // natively in the schema if concurrency > 1. For observability, we store the *most recent*
            // or an arbitrary active scan_id, and put the full list in metadata.
            const primaryScanId = Array.from(this.activeJobs)[0] || null;
            
            const metadata = {
                activeScanIds: Array.from(this.activeJobs),
                freemem: os.freemem(),
                loadavg: os.loadavg()
            };

            await pool.query(`
                INSERT INTO worker_leases (
                    worker_id, scan_id, hostname, pid, status, 
                    concurrency_limit, active_jobs, last_heartbeat_at, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
                ON CONFLICT (worker_id) DO UPDATE SET
                    scan_id = EXCLUDED.scan_id,
                    status = EXCLUDED.status,
                    active_jobs = EXCLUDED.active_jobs,
                    last_heartbeat_at = EXCLUDED.last_heartbeat_at,
                    metadata = EXCLUDED.metadata
            `, [
                this.workerId,
                primaryScanId,
                this.hostname,
                this.pid,
                status,
                this.concurrencyLimit,
                this.activeJobs.size,
                JSON.stringify(metadata)
            ]);
        } catch (error) {
            console.warn(`[WorkerLease] Heartbeat for ${this.workerId} deferred (DB connecting): ${error.message}`);
        }
    }
}
