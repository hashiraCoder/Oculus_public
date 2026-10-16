/**
 * scanner/engine/analyzer.interface.js
 *
 * IAnalyzer — the canonical contract every Oculus security analyzer must implement.
 *
 * Replaces: IEngine (engines/core/engine.interface.js)
 * Key change: getCapabilities() returns richer metadata including productionReady,
 * fileTypes, requiresProgramModel, and enabledByDefault. The AnalyzerRegistry uses
 * these to determine applicability WITHOUT any env-var engine-generation branching.
 *
 * All five production analyzers implement this interface:
 *   SecretAnalyzer, EntropyAnalyzer, SastAnalyzer, TaintAnalyzer, ScaAnalyzer
 */
export class IAnalyzer {
    constructor() {
        if (this.constructor === IAnalyzer) {
            throw new Error("IAnalyzer is an abstract class and cannot be instantiated directly.");
        }
    }

    /**
     * Returns the capability declaration for this analyzer.
     *
     * @returns {AnalyzerCapabilities}
     *
     * @typedef {object} AnalyzerCapabilities
     * @property {string}   id               — stable analyzer identifier, e.g. 'secret', 'taint'
     * @property {string}   version          — semver version string
     * @property {string}   category         — 'secrets' | 'sast' | 'taint' | 'sca'
     * @property {boolean}  productionReady  — if false, analyzer is experimental and only
     *                                         runs when OCULUS_SCAN_PROFILE=experimental
     * @property {boolean}  enabledByDefault — if false, requires explicit opt-in; combined with
     *                                         productionReady to control registration
     * @property {string[]} languages        — language keys this analyzer supports, e.g.
     *                                         ['javascript', 'typescript']. Empty array = all languages.
     * @property {string[]} fileTypes        — file classification types this analyzer supports,
     *                                         e.g. ['SOURCE', 'CONFIG', 'DEPENDENCY']. Maps to
     *                                         isEligibleFile() classifications.
     * @property {boolean}  requiresProgramModel — if true, AnalyzerContext.programModel must be
     *                                             populated before calling analyze().
     */
    getCapabilities() {
        throw new Error("IAnalyzer.getCapabilities() must be implemented.");
    }

    /**
     * Analyze a file and return findings.
     *
     * @param {import('./analyzer-context.js').AnalyzerContext} context
     * @returns {Promise<import('./analyzer-result.js').AnalyzerResult>}
     */
    async analyze(context) {
        throw new Error("IAnalyzer.analyze(context) must be implemented.");
    }
}
