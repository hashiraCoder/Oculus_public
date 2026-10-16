/**
 * scanner/engine/analyzer-result.js
 *
 * AnalyzerResult — the canonical result type returned by IAnalyzer.analyze().
 *
 * Replaces: EngineResult (engines/core/engine-result.js)
 *
 * Statuses:
 *   SUCCESS — analyzer ran to completion; findings (may be empty) are authoritative
 *   FAILED  — analyzer encountered an unrecoverable error; findings may be partial
 *   TIMEOUT — analyzer exceeded its time budget; findings are incomplete
 *   SKIPPED — analyzer was not applicable to this file; no findings produced
 */
export class AnalyzerResult {
    /**
     * @param {object} opts
     * @param {'SUCCESS'|'FAILED'|'TIMEOUT'|'SKIPPED'} opts.status
     * @param {object[]} [opts.findings]
     * @param {string|null} [opts.error]
     * @param {object} [opts.metrics]
     * @param {string|null} [opts.analyzerVersion]
     * @param {string[]} [opts.warnings]
     * @param {object} [opts.limits]
     * @param {string|null} [opts.reason]   — required when status === 'SKIPPED'; explains why
     */
    constructor({
        status,
        findings = [],
        error = null,
        metrics = {},
        analyzerVersion = null,
        warnings = [],
        limits = {},
        reason = null
    }) {
        this.status = status;
        this.findings = findings;
        this.error = error;
        this.metrics = metrics;

        /**
         * The version string of the analyzer that produced this result.
         * Set by the analyzer itself via getCapabilities().version.
         * @type {string|null}
         */
        this.analyzerVersion = analyzerVersion;

        /**
         * Non-fatal warnings produced during analysis.
         * @type {string[]}
         */
        this.warnings = warnings;

        /**
         * Resource limits that were hit during analysis.
         * @type {object}
         */
        this.limits = limits;

        /**
         * For SKIPPED results: human-readable reason why the analyzer was skipped.
         * Examples: 'unsupported_language', 'no_manifest_found', 'experimental_disabled'
         * This reason is recorded in ANALYZER_EVALUATION telemetry for every skipped analyzer,
         * ensuring it is always possible to answer "why didn't X analyzer run?".
         * @type {string|null}
         */
        this.reason = reason;
    }

    static success(findings, metrics = {}) {
        return new AnalyzerResult({ status: 'SUCCESS', findings, metrics });
    }

    static failure(error, metrics = {}) {
        return new AnalyzerResult({
            status: 'FAILED',
            error: error?.message || String(error),
            metrics
        });
    }

    static timeout(metrics = {}) {
        return new AnalyzerResult({ status: 'TIMEOUT', metrics });
    }

    /**
     * Analyzer was not applicable to this file.
     * @param {string} reason — why (must be present for observability)
     */
    static skipped(reason) {
        return new AnalyzerResult({ status: 'SKIPPED', reason, findings: [], metrics: {} });
    }
}
