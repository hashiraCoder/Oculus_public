/**
 * scanner/lifecycle/scan-lifecycle.js
 *
 * Canonical state machine for a Scan. Ensures strict state transitions.
 */
import { getPool } from '../../config/db.js';
import logger from '../../config/logger.js';

export const SCAN_STATES = {
    QUEUED: 'QUEUED',
    DISPATCHED: 'DISPATCHED',
    ACQUIRING_SOURCE: 'ACQUIRING_SOURCE',
    ANALYZING: 'ANALYZING',
    PERSISTING: 'PERSISTING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
    TIMEOUT: 'TIMEOUT'
};

const TERMINAL_STATES = ['COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT'];

export class ScanLifecycle {
    /**
     * Transitions a scan to a new state if valid.
     * @param {string} scanId 
     * @param {string} newState 
     * @param {Object} [options]
     * @param {string} [options.conclusion] - Set conclusion if transitioning to a final state
     * @param {string} [options.errorDetails]
     * @returns {Promise<boolean>} true if transition succeeded, false if rejected due to terminal state
     */
    static async transition(scanId, newState, options = {}) {
        const pool = getPool();
        
        // Final states
        const isFinal = TERMINAL_STATES.includes(newState);
        
        try {
            let result;
            if (isFinal) {
                // If it's a final state, we also set finished_at and conclusion (if provided).
                // Guard: cannot overwrite already terminal scan (e.g. if CANCELLED, do not overwrite with COMPLETED).
                let query = `UPDATE scans SET status = $1, finished_at = NOW()`;
                const params = [newState, scanId];
                let paramIndex = 3;
                
                if (options.conclusion) {
                    query += `, conclusion = $${paramIndex++}`;
                    params.push(options.conclusion);
                }
                
                query += ` WHERE id = $2 AND status NOT IN ('COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT') RETURNING id, status`;
                result = await pool.query(query, params);
            } else {
                result = await pool.query(
                    `UPDATE scans SET status = $1 WHERE id = $2 AND status NOT IN ('COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT') RETURNING id, status`,
                    [newState, scanId]
                );
            }

            if (result.rowCount === 0) {
                logger.warn(`[ScanLifecycle] Scan ${scanId} transition to ${newState} ignored: scan is already in a terminal state or not found.`);
                return false;
            }

            logger.info(`[ScanLifecycle] Scan ${scanId} transitioned to ${newState}`);
            return true;
        } catch (error) {
            logger.error(`[ScanLifecycle Error] Failed to transition scan ${scanId} to ${newState}:`, { error: error.message, stack: error.stack });
            throw error; // We want to throw here because state transitions are critical
        }
    }

    /**
     * Checks if a scan has been requested to cancel.
     * @param {string} scanId 
     * @returns {boolean}
     */
    static async isCancelRequested(scanId) {
        const pool = getPool();
        const res = await pool.query(`SELECT cancel_requested FROM scans WHERE id = $1`, [scanId]);
        return !!res.rows[0]?.cancel_requested;
    }
}
