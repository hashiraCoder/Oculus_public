/**
 * scanner/telemetry/telemetry.js
 *
 * Stage telemetry emitter. Records performance and usage metrics for discrete scan stages.
 * Failure-safe: telemetry errors must never fail the overarching scan.
 */
import { getPool } from '../../config/db.js';
import logger from '../../config/logger.js';

export class ScanTelemetry {
    /**
     * Records telemetry for a specific scan stage.
     * @param {Object} data
     * @param {string} data.scanId
     * @param {string} data.stageName - e.g., 'SOURCE_ACQUISITION', 'ENGINE_EXECUTION'
     * @param {string} [data.engineId]
     * @param {string} [data.engineVersion]
     * @param {string} data.status - 'SUCCESS', 'FAILED', 'TIMEOUT', 'SKIPPED'
     * @param {number} data.durationMs
     * @param {number} [data.memoryUsedMb]
     * @param {number} [data.filesProcessed]
     * @param {number} [data.findingsProduced]
     * @param {number} [data.cacheHits]
     * @param {number} [data.cacheMisses]
     * @param {string} [data.errorMessage]
     * @param {Object} [data.metadata]
     */
    static async record(data) {
        try {
            const pool = getPool();
            await pool.query(`
                INSERT INTO scan_stage_telemetry (
                    scan_id, stage_name, engine_id, engine_version, status,
                    duration_ms, memory_used_mb, files_processed, findings_produced,
                    cache_hits, cache_misses, error_message, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `, [
                data.scanId,
                data.stageName,
                data.engineId || null,
                data.engineVersion || null,
                data.status,
                data.durationMs,
                data.memoryUsedMb || null,
                data.filesProcessed || null,
                data.findingsProduced || null,
                data.cacheHits || 0,
                data.cacheMisses || 0,
                data.errorMessage || null,
                data.metadata ? JSON.stringify(data.metadata) : null
            ]);
            logger.info(`[ScanTelemetry] Persisted stage telemetry: ${data.stageName}`, {
                scanId: data.scanId,
                stageName: data.stageName,
                engineId: data.engineId || null,
                status: data.status,
                durationMs: data.durationMs
            });
        } catch (error) {
            // Failure-safe: log but do not throw
            logger.error(`[ScanTelemetry Error] Failed to persist telemetry for scan ${data.scanId}, stage ${data.stageName}:`, {
                scanId: data.scanId,
                stageName: data.stageName,
                error: error.message
            });
            console.error(`[ScanTelemetry Error] Failed to persist telemetry for scan ${data.scanId}, stage ${data.stageName}:`, error);
        }
    }

    static async recordBatch(records) {
        if (!records || records.length === 0) return { success: true, count: 0 };
        try {
            const pool = getPool();
            const valueClauses = [];
            const values = [];
            let paramIdx = 1;

            for (const data of records) {
                valueClauses.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5}, $${paramIdx + 6}, $${paramIdx + 7}, $${paramIdx + 8}, $${paramIdx + 9}, $${paramIdx + 10}, $${paramIdx + 11}, $${paramIdx + 12})`);
                values.push(
                    data.scanId,
                    data.stageName,
                    data.engineId || null,
                    data.engineVersion || null,
                    data.status || 'SUCCESS',
                    data.durationMs || 0,
                    data.memoryUsedMb || null,
                    data.filesProcessed || null,
                    data.findingsProduced || null,
                    data.cacheHits || 0,
                    data.cacheMisses || 0,
                    data.errorMessage || null,
                    data.metadata ? JSON.stringify(data.metadata) : null
                );
                paramIdx += 13;
            }

            await pool.query(`
                INSERT INTO scan_stage_telemetry (
                    scan_id, stage_name, engine_id, engine_version, status,
                    duration_ms, memory_used_mb, files_processed, findings_produced,
                    cache_hits, cache_misses, error_message, metadata
                ) VALUES ${valueClauses.join(', ')}
            `, values);

            logger.info(`[ScanTelemetry] Successfully persisted telemetry batch (${records.length} records)`, {
                scanId: records[0]?.scanId,
                recordsGenerated: records.length,
                recordsPersisted: records.length,
                recordsFailed: 0
            });
            return { success: true, count: records.length };
        } catch (error) {
            // Failure-safe: log structured failure metrics so operators can observe
            logger.error(`[ScanTelemetry Error] Failed to persist telemetry batch (${records.length} items):`, {
                scanId: records[0]?.scanId,
                recordsGenerated: records.length,
                recordsPersisted: 0,
                recordsFailed: records.length,
                error: error.message,
                stack: error.stack
            });
            console.error(`[ScanTelemetry Error] Failed to persist telemetry batch (${records.length} items):`, error);
            return { success: false, count: 0, error: error.message };
        }
    }
}
