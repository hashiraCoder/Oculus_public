/**
 * scanner/engine/oculus-security-engine.js
 *
 * OculusSecurityEngine — Canonical production security engine.
 *
 * Execution flow per file:
 *   1. Binary detection (null-byte check)
 *   2. Language detection (extension-based)
 *   3. File classification (source eligibility)
 *   4. Build AnalyzerContext
 *   5. registry.getApplicableAnalyzers(context) -> applicable list + SKIPPED evaluations
 *   6. Execute ALL applicable analyzers concurrently (up to MAX_CONCURRENT_ANALYZERS)
 *   7. Per-analyzer timeout isolation
 *   8. Normalize findings to canonical contract
 *   9. Return findings + ANALYZER_EVALUATION records
 *
 * OBSERVABILITY GUARANTEE:
 *   For every registered analyzer, the result includes an ANALYZER_EVALUATION record.
 *
 * ISOLATION GUARANTEE:
 *   One analyzer timing out or throwing MUST NOT prevent other applicable analyzers
 *   from executing. Findings from successful analyzers are persisted regardless.
 */

import fs from 'fs';
import path from 'path';
import { AnalyzerContext } from './analyzer-context.js';
import { AnalyzerResult } from './analyzer-result.js';
import { normalizeFindig, encryptSnippet, generateFingerprint } from './finding.js';
import { isEligibleFile } from '../eligibility/source-eligibility.js';

const MAX_CONCURRENT_ANALYZERS = parseInt(process.env.MAX_CONCURRENT_ANALYZERS || '4', 10);
const ANALYZER_TIMEOUT_MS = parseInt(process.env.ANALYZER_TIMEOUT_MS || '30000', 10);

const LANGUAGE_MAP = {
    '.js':   'javascript',
    '.jsx':  'javascript',
    '.mjs':  'javascript',
    '.cjs':  'javascript',
    '.ts':   'typescript',
    '.tsx':  'typescript',
    '.mts':  'typescript',
    '.cts':  'typescript',
    '.py':   'python',
    '.rb':   'ruby',
    '.go':   'go',
    '.java': 'java',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml':  'yaml',
    '.toml': 'toml',
    '.sh':   'shell',
    '.bash': 'shell',
};

export class OculusSecurityEngine {
    /**
     * @param {object} opts
     * @param {import('./analyzer-registry.js').AnalyzerRegistry} opts.registry
     * @param {object} [opts.governor]
     * @param {object} [opts.telemetry]
     */
    constructor({ registry, governor = null, telemetry = null } = {}) {
        if (!registry) throw new Error('OculusSecurityEngine requires an AnalyzerRegistry');
        this._registry = registry;
        this._governor = governor;
        this._telemetry = telemetry;
    }

    async analyzeFile(fileEntry, jobContext) {
        return this.scanFile(fileEntry, jobContext);
    }

    /**
     * Analyze a single file.
     *
     * @param {object} fileEntry
     * @param {string} fileEntry.filename
     * @param {string} fileEntry.absolutePath
     * @param {object} jobContext
     * @returns {Promise<{ findings: object[], evaluations: object[], metrics: object }>}
     */
    async scanFile(fileEntry, jobContext) {
        const absolutePath = fileEntry.absolutePath;
        const relativePath = fileEntry.filename;
        const evaluations = [];
        const findings = [];
        const fileStart = Date.now();

        const metrics = {
            filePath: relativePath,
            fileSize: 0,
            analyzersExecuted: 0,
            analyzersSkipped: 0,
            analyzersFailed: 0,
            analyzersTimedOut: 0,
            durationMs: 0,
            skipped: false
        };

        // 1. Stat the file
        let stats;
        try {
            stats = fs.statSync(absolutePath);
            metrics.fileSize = stats.size;
        } catch {
            return { findings: [], evaluations, metrics: { ...metrics, error: 'stat_failed' } };
        }

        // 2. Source eligibility
        const { eligible, reason: eligReason, classification } = isEligibleFile(relativePath, stats);
        if (!eligible) {
            evaluations.push({
                analyzerId: '*',
                filePath: relativePath,
                decision: 'FILE_SKIPPED',
                reason: `file_ineligible:${eligReason}`,
                status: 'SKIPPED',
                durationMs: 0,
                findingCount: 0
            });
            return { findings: [], evaluations, metrics: { ...metrics, fileType: classification, skipped: true } };
        }

        // 3. Language detection
        const ext = path.extname(relativePath).toLowerCase();
        const language = LANGUAGE_MAP[ext] || 'unknown';

        // 4. Binary detection
        try {
            const fd = fs.openSync(absolutePath, 'r');
            const buf = Buffer.alloc(512);
            const bytesRead = fs.readSync(fd, buf, 0, 512, 0);
            fs.closeSync(fd);
            if (buf.slice(0, bytesRead).includes(0)) {
                evaluations.push({
                    analyzerId: '*',
                    filePath: relativePath,
                    decision: 'FILE_SKIPPED',
                    reason: 'binary_file',
                    status: 'SKIPPED',
                    durationMs: 0,
                    findingCount: 0
                });
                return { findings: [], evaluations, metrics: { ...metrics, language, fileType: classification, skipped: true } };
            }
        } catch {
            return { findings: [], evaluations, metrics: { ...metrics, error: 'read_failed' } };
        }

        // 5. Build AnalyzerContext
        const context = new AnalyzerContext({
            scanId: jobContext.scanId,
            repositoryId: jobContext.repositoryId,
            isBaseline: jobContext.isBaseline || false,
            file: { absolutePath, relativePath },
            language,
            fileType: classification,
            programModel: null,
            governor: this._governor,
        });

        // 6. Get applicable analyzers
        const { applicable, evaluations: registryEvals } = this._registry.getApplicableAnalyzers(context);

        for (const ev of registryEvals) {
            if (ev.decision === 'SKIPPED') {
                evaluations.push({
                    analyzerId: ev.analyzerId,
                    analyzerVersion: ev.analyzerVersion,
                    filePath: relativePath,
                    language,
                    fileType: classification,
                    status: 'SKIPPED',
                    reason: ev.reason,
                    durationMs: 0,
                    findingCount: 0
                });
                metrics.analyzersSkipped++;
            }
        }

        // 7. Execute applicable analyzers in batches
        for (let i = 0; i < applicable.length; i += MAX_CONCURRENT_ANALYZERS) {
            const batch = applicable.slice(i, i + MAX_CONCURRENT_ANALYZERS);
            const batchResults = await Promise.all(
                batch.map(analyzer => this._executeAnalyzerIsolated(analyzer, context))
            );

            for (const { result, capabilities, durationMs } of batchResults) {
                const findingCount = result.findings?.length || 0;

                evaluations.push({
                    analyzerId: capabilities.id,
                    analyzerVersion: capabilities.version,
                    filePath: relativePath,
                    language,
                    fileType: classification,
                    status: result.status,
                    reason: result.reason || (result.status === 'SUCCESS' ? 'completed' : 'analyzer_error'),
                    durationMs,
                    findingCount,
                    warnings: result.warnings?.length ? result.warnings : undefined,
                    error: result.error || undefined,
                });

                if (result.status === 'SUCCESS') {
                    metrics.analyzersExecuted++;
                } else if (result.status === 'TIMEOUT') {
                    metrics.analyzersTimedOut++;
                } else if (result.status === 'FAILED') {
                    metrics.analyzersFailed++;
                } else if (result.status === 'SKIPPED') {
                    metrics.analyzersSkipped++;
                }

                // Normalize findings
                if (result.findings?.length) {
                    for (const raw of result.findings) {
                        try {
                            const canonical = normalizeFindig(raw, capabilities, jobContext.repositoryId);
                            if (canonical.snippet) {
                                canonical.encryptedSnippet = encryptSnippet(canonical.snippet);
                            }
                            findings.push(canonical);
                        } catch (normErr) {
                            console.error(`[OculusSecurityEngine] Finding normalization failed:`, normErr);
                        }
                    }
                }
            }
        }

        metrics.durationMs = Date.now() - fileStart;
        return { findings, evaluations, metrics };
    }

    async _executeAnalyzerIsolated(analyzer, context) {
        const capabilities = analyzer.getCapabilities();
        const start = Date.now();
        const timeoutMs = context.governor?.limits?.engineTimeoutMs || this._governor?.limits?.engineTimeoutMs || ANALYZER_TIMEOUT_MS;

        let timeoutHandle;
        const timeoutPromise = new Promise(resolve => {
            timeoutHandle = setTimeout(() => {
                resolve(new AnalyzerResult({
                    status: 'TIMEOUT',
                    error: `Analyzer exceeded ${timeoutMs}ms timeout`,
                    analyzerVersion: capabilities.version,
                    reason: 'analyzer_timeout'
                }));
            }, timeoutMs);
        });

        try {
            const analysisPromise = analyzer.analyze(context);
            const result = await Promise.race([analysisPromise, timeoutPromise]);
            clearTimeout(timeoutHandle);
            return { result, capabilities, durationMs: Date.now() - start };
        } catch (err) {
            clearTimeout(timeoutHandle);
            return {
                result: new AnalyzerResult({
                    status: 'FAILED',
                    error: err.message || String(err),
                    analyzerVersion: capabilities.version,
                    reason: 'unhandled_exception'
                }),
                capabilities,
                durationMs: Date.now() - start
            };
        }
    }
}
