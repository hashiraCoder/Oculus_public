/**
 * scanner/sandbox/scanner-thread.worker.js
 *
 * Canonical scanner worker thread.
 *
 * MIGRATION COMPLETE: All V1/V2/v2-sca/next/canonical/shadow/next-shadow engine-mode
 * branches have been removed. The production execution path is now:
 *
 *   workerData
 *    └── OculusSecurityEngine
 *         └── AnalyzerRegistry
 *              ├── SecretAnalyzer
 *              ├── EntropyAnalyzer
 *              ├── SastAnalyzer
 *              ├── TaintAnalyzer
 *              └── ScaAnalyzer
 *
 * Every applicable analyzer executes automatically. No environment variable selects
 * an alternative engine implementation.
 *
 * OBSERVABILITY: Per-file ANALYZER_EVALUATION records are included in the result.
 * Every registered analyzer is accounted for — EXECUTED, SKIPPED (with reason),
 * FAILED, or TIMEOUT. This makes it permanently answerable:
 *   "Why didn't TaintAnalyzer run for this file?"
 *
 * ISOLATION: One analyzer timing out or failing does NOT stop other analyzers.
 *
 * REMOVED:
 *   - scanFileV1()
 *   - scanFileV2()
 *   - engineMode const / all if-else engineMode branches
 *   - SCANNER_ENGINE_VERSION env var reads
 *   - V1 SecretEngine / EntropyEngine imports
 *   - V2 adapter imports
 *   - EngineRegistry / AnalysisContext / EngineResult
 *   - shadow / next-shadow comparison logic (obsoleted by per-analyzer telemetry)
 *   - allV2Findings / allNextFindings accumulator variables
 */

import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import { ResourceGovernor } from '../resource/resource-governor.js';
import { DiffPlanner } from '../incremental/diff-planner.js';
import { OculusSecurityEngine } from '../engine/oculus-security-engine.js';
import { createProductionAnalyzerRegistry } from '../engine/analyzer-registry.js';

// ============================================================================
// MAIN EXECUTION
// ============================================================================
const run = async () => {
    try {
        const { jobData } = workerData;
        const { scanId, repositoryId, prFiles, isBaseline } = jobData;

        // ── Build the canonical analyzer registry ─────────────────────────────
        // All five production analyzers are registered here.
        // No env var controls which analyzers are active — all applicable ones run.
        const registry = await createProductionAnalyzerRegistry();

        const metrics = {
            totalDiscovered: prFiles.length,
            excludedDirectories: 0,
            excludedExtensions: 0,
            binaryFilesSkipped: 0,
            oversizedFilesSkipped: 0,
            eligibleSourceFiles: 0,
            filesScanned: 0,
            analyzersExecuted: 0,
            analyzersSkipped: 0,
            analyzersFailed: 0,
            analyzersTimedOut: 0,
            totalFindings: 0,
            programModelsBuilt: 0,
            telemetry: [],      // per-file analyzer evaluation records
        };

        const tempDir = isBaseline
            ? path.join('/tmp', 'oculus', 'baseline', String(scanId))
            : path.join('/tmp', 'oculus', 'scans', String(scanId));

        // ── Resource Governor ─────────────────────────────────────────────────
        const governor = new ResourceGovernor(jobData.limits || {});

        // ── Incremental Analysis Planning ─────────────────────────────────────
        const explicitlyChanged = prFiles
            .filter(f => ['added', 'modified', 'renamed', 'copied'].includes(f.status))
            .map(f => f.filename.replace(/\\/g, '/'));

        const diffPlanner = new DiffPlanner(repositoryId);
        const incrementalPlan = await diffPlanner.plan({
            prFiles,
            tempDir,
            isBaseline,
            explicitlyChanged
        });

        metrics.incrementalMode = incrementalPlan.mode;
        metrics.filesSkippedByCache = incrementalPlan.skippedFiles.size;
        metrics.cacheHits = incrementalPlan.cacheHits;
        metrics.importGraphEdges = incrementalPlan.importGraphEdges;

        if (incrementalPlan.mode === 'incremental') {
            const skipCount = incrementalPlan.skippedFiles.size;
            const total = incrementalPlan.totalFiles;
            console.log(`[INCREMENTAL] scanId:${scanId} mode:incremental total:${total} skipped:${skipCount} affected:${incrementalPlan.affectedFiles.size} importEdges:${incrementalPlan.importGraphEdges}`);
        }

        // ── Build canonical engine ────────────────────────────────────────────
        const engine = new OculusSecurityEngine({
            registry,
            governor,
        });

        const jobContext = { scanId, repositoryId, isBaseline };
        const allFindings = [];

        // ── Per-file analysis loop ────────────────────────────────────────────
        for (const file of prFiles) {
            if (file.status === 'removed') continue;

            // Incremental skip: unchanged + not imported by changed file
            const normalizedFilename = file.filename.replace(/\\/g, '/');
            if (incrementalPlan.mode === 'incremental' && !incrementalPlan.affectedFiles.has(normalizedFilename)) {
                metrics.filesSkippedByCache = (metrics.filesSkippedByCache || 0) + 1;
                continue;
            }

            const absolutePath = path.join(tempDir, file.filename);
            if (!fs.existsSync(absolutePath)) continue;

            // Track resource limits at file boundary
            const stats = fs.statSync(absolutePath);
            governor.trackFileProcessed();
            governor.trackExtraction(stats.size);
            governor.checkpoint();

            // ── OculusSecurityEngine: single canonical call ───────────────────
            const { findings, evaluations, metrics: fileMetrics } = await engine.analyzeFile(
                { filename: file.filename, absolutePath },
                jobContext
            );

            // Accumulate findings
            allFindings.push(...findings);

            // Accumulate per-file metrics
            if (!fileMetrics.skipped) {
                metrics.eligibleSourceFiles++;
                metrics.filesScanned++;
                metrics.analyzersExecuted     += fileMetrics.analyzersExecuted     || 0;
                metrics.analyzersSkipped      += fileMetrics.analyzersSkipped      || 0;
                metrics.analyzersFailed       += fileMetrics.analyzersFailed       || 0;
                metrics.analyzersTimedOut     += fileMetrics.analyzersTimedOut     || 0;
                metrics.totalFindings         += fileMetrics.totalFindings         || 0;
                if (fileMetrics.programModelBuilt) metrics.programModelsBuilt++;
            }

            // Accumulate ANALYZER_EVALUATION telemetry records
            metrics.telemetry.push(...evaluations);
        }

        // ── Fail-closed protection ─────────────────────────────────────────────
        // If eligible source files existed but zero analyzers executed, the scan is broken.
        if (metrics.eligibleSourceFiles > 0 && metrics.analyzersExecuted === 0) {
            throw new Error(
                `ENGINE_NOT_EXECUTED: OculusSecurityEngine produced 0 analyzer executions ` +
                `across ${metrics.eligibleSourceFiles} eligible files. ` +
                `Check ANALYZER_EVALUATION records in telemetry for skip reasons.`
            );
        }

        metrics.enginesExecuted = metrics.analyzersExecuted;

        // ── Incremental stats ─────────────────────────────────────────────────
        const incrementalStats = {
            mode: incrementalPlan.mode,
            totalFiles: incrementalPlan.totalFiles,
            affectedFiles: incrementalPlan.affectedFiles.size,
            skippedFiles: incrementalPlan.skippedFiles.size,
            cacheHits: incrementalPlan.cacheHits,
            importGraphEdges: incrementalPlan.importGraphEdges
        };

        parentPort.postMessage({
            payload: {
                findings: allFindings,
                metrics,
                incrementalStats,
                // shadowComparison removed: per-analyzer ANALYZER_EVALUATION telemetry
                // in metrics.telemetry replaces shadow comparison as the observability mechanism.
                analyzerEvaluations: metrics.telemetry,
            }
        });
    } catch (error) {
        parentPort.postMessage({ error: error.message });
    }
};

run();
