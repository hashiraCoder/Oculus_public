/**
 * scanner/engine/analyzer-registry.js
 *
 * AnalyzerRegistry — Canonical registry for all Oculus security analyzers.
 *
 * Key principles:
 *  1. Applicability is determined by analyzer capabilities + file context.
 *  2. Experimental analyzers only run when OCULUS_SCAN_PROFILE=experimental.
 *  3. Every evaluation produces an ANALYZER_EVALUATION record for observability.
 */

const SCAN_PROFILE = (process.env.OCULUS_SCAN_PROFILE || 'production').toLowerCase();
const IS_EXPERIMENTAL = SCAN_PROFILE === 'experimental';

export class AnalyzerRegistry {
    constructor() {
        /** @type {import('./analyzer.interface.js').IAnalyzer[]} */
        this._analyzers = [];
    }

    /**
     * Register an analyzer.
     * @param {import('./analyzer.interface.js').IAnalyzer} analyzer
     */
    register(analyzer) {
        const cap = analyzer.getCapabilities();
        if (!cap.id || !cap.version) {
            throw new Error(`Analyzer missing required capabilities.id or capabilities.version`);
        }
        if (this._analyzers.some(a => a.getCapabilities().id === cap.id)) {
            throw new Error(`Analyzer '${cap.id}' is already registered.`);
        }
        this._analyzers.push(analyzer);
    }

    /**
     * Determine which analyzers are applicable for a given file context.
     * @param {import('./analyzer-context.js').AnalyzerContext} context
     * @returns {{ applicable: import('./analyzer.interface.js').IAnalyzer[], evaluations: object[] }}
     */
    getApplicableAnalyzers(context) {
        const applicable = [];
        const evaluations = [];

        for (const analyzer of this._analyzers) {
            const cap = analyzer.getCapabilities();

            // Gate 1: Profile check
            if (!cap.productionReady && !IS_EXPERIMENTAL) {
                evaluations.push({
                    analyzerId: cap.id,
                    analyzerVersion: cap.version,
                    decision: 'SKIPPED',
                    reason: 'experimental_disabled'
                });
                continue;
            }

            // Gate 2: Language check
            if (cap.languages && cap.languages.length > 0) {
                if (!cap.languages.includes(context.language)) {
                    evaluations.push({
                        analyzerId: cap.id,
                        analyzerVersion: cap.version,
                        decision: 'SKIPPED',
                        reason: `unsupported_language:${context.language}`
                    });
                    continue;
                }
            }

            // Gate 3: File type check
            if (cap.fileTypes && cap.fileTypes.length > 0) {
                if (!cap.fileTypes.includes(context.fileType)) {
                    evaluations.push({
                        analyzerId: cap.id,
                        analyzerVersion: cap.version,
                        decision: 'SKIPPED',
                        reason: `unsupported_file_type:${context.fileType}`
                    });
                    continue;
                }
            }

            // Gate 4: ProgramModel requirement
            if (cap.requiresProgramModel && !context.programModel) {
                evaluations.push({
                    analyzerId: cap.id,
                    analyzerVersion: cap.version,
                    decision: 'SKIPPED',
                    reason: 'requires_program_model_unavailable'
                });
                continue;
            }

            // APPLICABLE
            applicable.push(analyzer);
            evaluations.push({
                analyzerId: cap.id,
                analyzerVersion: cap.version,
                decision: 'APPLICABLE',
                reason: `${cap.productionReady ? 'production' : 'experimental'}_ready_applicable`
            });
        }

        return { applicable, evaluations };
    }

    getAll() {
        return [...this._analyzers];
    }
}

/**
 * Factory: create the public analyzer registry populated with reference analyzers.
 * @returns {Promise<AnalyzerRegistry>}
 */
export async function createProductionAnalyzerRegistry() {
    const registry = new AnalyzerRegistry();

    const {
        ReferenceSecretAnalyzer,
        ReferenceSastAnalyzer,
        ReferenceScaAnalyzer
    } = await import('./reference-analyzers.js');

    registry.register(new ReferenceSecretAnalyzer());
    registry.register(new ReferenceSastAnalyzer());
    registry.register(new ReferenceScaAnalyzer());

    return registry;
}
