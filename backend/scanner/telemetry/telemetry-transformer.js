/**
 * scanner/telemetry/telemetry-transformer.js
 *
 * Canonical transformation layer between raw analyzer evaluations and ScanTelemetry.
 * Converts heterogeneous file-level evaluations into stage-level telemetry records
 * compatible with the `scan_stage_telemetry` database schema.
 */

/**
 * Derives the canonical aggregate status from engine evaluation counts.
 * Strictly preserves failures and timeouts without overly optimistic reductions.
 *
 * @param {object} counts
 * @param {number} counts.executed
 * @param {number} counts.successful
 * @param {number} counts.skipped
 * @param {number} counts.timeouts
 * @param {number} counts.failed
 * @returns {'SUCCESS'|'FAILED'|'TIMEOUT'|'SKIPPED'}
 */
export function deriveEngineAggregateStatus({ executed, successful, skipped, timeouts, failed }) {
    if (failed > 0 && timeouts === 0) {
        return 'FAILED';
    }
    if (timeouts > 0) {
        return 'TIMEOUT';
    }
    if (executed > 0) {
        return 'SUCCESS';
    }
    return 'SKIPPED';
}

/**
 * Transforms raw file evaluations and stage metrics into canonical telemetry records.
 *
 * @param {string} scanId - Target scan ID
 * @param {object[]} [rawEvaluations=[]] - Raw per-file evaluations from OculusSecurityEngine
 * @param {object[]} [stageRecords=[]] - Discrete stage records (e.g. CORRELATION, PERSISTENCE)
 * @returns {object[]} Canonical telemetry records ready for ScanTelemetry.recordBatch()
 */
export function transformToCanonicalTelemetry(scanId, rawEvaluations = [], stageRecords = []) {
    const canonicalRecords = [];

    // 1. Process and aggregate raw analyzer evaluations by engine
    if (Array.isArray(rawEvaluations) && rawEvaluations.length > 0) {
        // Group evaluations by engine ID (excluding '*' which is file-level eligibility)
        const engineGroups = new Map();

        for (const evalItem of rawEvaluations) {
            if (!evalItem) continue;
            const engineId = evalItem.analyzerId || evalItem.engineId;
            if (!engineId || engineId === '*') continue;

            if (!engineGroups.has(engineId)) {
                engineGroups.set(engineId, []);
            }
            engineGroups.get(engineId).push(evalItem);
        }

        for (const [engineId, evals] of engineGroups.entries()) {
            let executed = 0;
            let successful = 0;
            let skipped = 0;
            let timeouts = 0;
            let failed = 0;
            let findingsProduced = 0;
            let durationMs = 0;
            let engineVersion = null;
            let firstErrorMessage = null;
            const skipReasons = {};
            const failureReasons = {};

            for (const ev of evals) {
                if (!engineVersion && (ev.analyzerVersion || ev.engineVersion)) {
                    engineVersion = ev.analyzerVersion || ev.engineVersion;
                }

                durationMs += typeof ev.durationMs === 'number' ? ev.durationMs : 0;
                findingsProduced += typeof ev.findingCount === 'number'
                    ? ev.findingCount
                    : (typeof ev.findingsProduced === 'number' ? ev.findingsProduced : 0);

                const status = (ev.status || '').toUpperCase();
                if (status === 'SUCCESS') {
                    executed++;
                    successful++;
                } else if (status === 'TIMEOUT') {
                    executed++;
                    timeouts++;
                    if (!firstErrorMessage) {
                        firstErrorMessage = ev.error || ev.reason || 'Engine execution timed out';
                    }
                } else if (status === 'FAILED') {
                    executed++;
                    failed++;
                    const reason = ev.error || ev.reason || 'Unknown analyzer failure';
                    failureReasons[reason] = (failureReasons[reason] || 0) + 1;
                    if (!firstErrorMessage) {
                        firstErrorMessage = reason;
                    }
                } else {
                    // SKIPPED or other non-executed
                    skipped++;
                    const reason = ev.reason || 'skipped';
                    skipReasons[reason] = (skipReasons[reason] || 0) + 1;
                }
            }

            const totalEvaluations = evals.length;
            const status = deriveEngineAggregateStatus({
                executed,
                successful,
                skipped,
                timeouts,
                failed
            });

            canonicalRecords.push({
                scanId,
                stageName: 'ENGINE_EXECUTION',
                engineId,
                engineVersion: engineVersion || '1.0.0',
                status,
                durationMs: Math.round(durationMs),
                memoryUsedMb: null,
                filesProcessed: executed,
                findingsProduced,
                cacheHits: 0,
                cacheMisses: 0,
                errorMessage: firstErrorMessage,
                metadata: {
                    totalEvaluations,
                    executed,
                    successful,
                    skipped,
                    timeouts,
                    failed,
                    skipReasons,
                    failureReasons,
                    timeoutCount: timeouts
                }
            });
        }
    }

    // 2. Format and explicitly map discrete stage records (e.g. CORRELATION, PERSISTENCE)
    if (Array.isArray(stageRecords)) {
        for (const stage of stageRecords) {
            if (!stage || !stage.stageName) continue;

            canonicalRecords.push({
                scanId,
                stageName: stage.stageName,
                engineId: stage.engineId || null,
                engineVersion: stage.engineVersion || null,
                status: stage.status || 'SUCCESS',
                durationMs: typeof stage.durationMs === 'number' ? Math.round(stage.durationMs) : 0,
                memoryUsedMb: stage.memoryUsedMb || null,
                filesProcessed: stage.filesProcessed || null,
                findingsProduced: stage.findingsProduced || null,
                cacheHits: stage.cacheHits || 0,
                cacheMisses: stage.cacheMisses || 0,
                errorMessage: stage.errorMessage || null,
                metadata: stage.metadata || null
            });
        }
    }

    return canonicalRecords;
}
