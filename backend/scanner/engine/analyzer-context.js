/**
 * scanner/engine/analyzer-context.js
 *
 * AnalyzerContext — the context object injected into every IAnalyzer.analyze() call.
 *
 * Replaces: AnalysisContext (engines/core/engine-context.js)
 *
 * Key additions over AnalysisContext:
 *  - programModel: the canonical per-file ProgramModel, built once by OculusSecurityEngine
 *    and shared across all analyzers that need it (SastAnalyzer, TaintAnalyzer).
 *    Analyzers that declare requiresProgramModel: true MUST receive this non-null.
 *  - language: explicit language detection result from OculusSecurityEngine
 *  - fileType: source classification from isEligibleFile()
 */
export class AnalyzerContext {
    /**
     * @param {object} params
     * @param {string} params.scanId
     * @param {string} params.repositoryId
     * @param {boolean} params.isBaseline
     * @param {object} params.file
     * @param {string} params.file.absolutePath
     * @param {string} params.file.relativePath
     * @param {string} params.language        — detected language, e.g. 'javascript', 'unknown'
     * @param {string} params.fileType        — classification: 'SOURCE'|'CONFIG'|'DEPENDENCY'|...
     * @param {object|null} params.programModel — canonical ProgramModel (null for non-JS/TS or if build failed)
     * @param {object} params.governor        — ResourceGovernor instance
     */
    constructor({
        scanId,
        repositoryId,
        isBaseline = false,
        file,
        language = 'unknown',
        fileType = 'SOURCE',
        programModel = null,
        governor = null
    }) {
        this.scanId = scanId;
        this.repositoryId = repositoryId;
        this.isBaseline = isBaseline;
        this.file = file;
        this.language = language;
        this.fileType = fileType;
        /** @type {import('../program-model/program-model.js').ProgramModel|null} */
        this.programModel = programModel;
        this.governor = governor;
    }
}
