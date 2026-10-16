/**
 * scanner/engine/finding.js
 *
 * Canonical finding structure produced by all Oculus analyzers.
 *
 * Every analyzer (SecretAnalyzer, EntropyAnalyzer, SastAnalyzer, TaintAnalyzer, ScaAnalyzer)
 * must emit findings that conform to this contract. Analyzer-specific metadata goes into
 * the `evidence` object.
 *
 * This eliminates the V1/V2/NEXT finding-model fragmentation:
 *   - V1 had no engine/version/ruleType fields
 *   - V2 added ruleType='SECRET' via adapters
 *   - NEXT added vulnerabilityClass, cwe, confidenceScore
 *
 * All fields must be populated by every analyzer where applicable.
 * Use null for fields not applicable to the analyzer's detection method.
 */

import crypto from 'crypto';

/**
 * Generate a stable fingerprint for a finding.
 * The fingerprint is the canonical deduplication key.
 *
 * IMPORTANT: Line number is excluded to preserve stability across code movement.
 * Same vulnerability in the same file detected by the same rule = same fingerprint.
 *
 * @param {string} repositoryId
 * @param {string} relativePath
 * @param {string} ruleId
 * @param {string} snippet
 * @returns {string} hex SHA-256
 */
export function generateFingerprint(repositoryId, relativePath, ruleId, snippet) {
    return crypto
        .createHash('sha256')
        .update(`${repositoryId}:${relativePath}:${ruleId}:${snippet}`)
        .digest('hex');
}

/**
 * Normalize a raw finding from an analyzer into the canonical contract.
 *
 * @param {object} raw — raw finding from analyzer
 * @param {object} capabilities — analyzer capabilities from getCapabilities()
 * @param {string} repositoryId
 * @returns {object} canonical finding
 */
export function normalizeFindig(raw, capabilities, repositoryId) {
    return {
        // ── Identity ──────────────────────────────────────────────────────────
        fingerprint: raw.fingerprint || generateFingerprint(
            repositoryId,
            raw.filePath,
            raw.ruleId,
            raw.snippet || ''
        ),

        // ── Analyzer identity ─────────────────────────────────────────────────
        analyzerId: capabilities.id,
        analyzerVersion: capabilities.version,
        engine: raw.engine || capabilities.id,
        engineVersion: raw.engineVersion || capabilities.version,

        // ── Rule ─────────────────────────────────────────────────────────────
        ruleId: raw.ruleId || null,
        ruleVersion: raw.ruleVersion || null,
        ruleType: raw.ruleType || capabilities.category?.toUpperCase() || null,

        // ── Severity ─────────────────────────────────────────────────────────
        severity: raw.severity || 'MEDIUM',
        confidence: raw.confidence || 'MEDIUM',
        confidenceScore: raw.confidenceScore || 100,

        // ── Classification ────────────────────────────────────────────────────
        vulnerabilityClass: raw.vulnerabilityClass || raw.ruleType || null,
        cwe: raw.cwe || null,

        // ── Location ─────────────────────────────────────────────────────────
        filePath: raw.filePath,
        lineNumber: raw.lineNumber || null,
        column: raw.column || null,

        // ── Snippet (raw, before encryption by caller) ────────────────────────
        snippet: raw.snippet || null,

        // ── Evidence (analyzer-specific) ─────────────────────────────────────
        evidence: raw.evidence || {},

        // ── Internal (set by OculusSecurityEngine) ────────────────────────────
        encryptedSnippet: null, // populated by engine after normalization
    };
}

import { encrypt as canonicalEncrypt } from '../utils/encryption.js';

/**
 * Encrypt a snippet using AES-256-GCM via canonical encryption utility.
 * Called by OculusSecurityEngine after normalization, before persistence.
 *
 * @param {string} snippet
 * @returns {string|null} iv:authTag:encrypted hex string, or null if no snippet
 */
export function encryptSnippet(snippet) {
    return canonicalEncrypt(snippet);
}
