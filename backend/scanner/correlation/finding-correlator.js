import crypto from 'crypto';

/**
 * FindingCorrelator
 *
 * Responsibility: Given a flat list of raw findings from multiple engines,
 * produce a deduplicated list of canonical findings, each accompanied by
 * a list of evidence entries recording which engines detected it.
 *
 * Correlation strategy:
 *   Two findings are the SAME vulnerability if they share the same fingerprint.
 *   The fingerprint is stable across engines (SHA256 of repositoryId + filePath +
 *   ruleId + normalized snippet).
 *
 * When two engines detect the same fingerprint:
 *   - The canonical finding is retained (first seen wins for identity fields).
 *   - Confidence is boosted: multi-engine corroboration increases confidence score.
 *   - Both engine detections are recorded as evidence entries.
 *
 * Output shape per canonical finding:
 *   {
 *     ...finding fields,
 *     corroborationCount: number,      // how many engines agreed
 *     corroborationScore: number,      // boosted confidence score (100 + 15 per extra engine)
 *     evidence: EvidenceEntry[]
 *   }
 *
 * EvidenceEntry:
 *   {
 *     engineId: string,
 *     engineVersion: string | null,
 *     ruleId: string | null,
 *     ruleVersion: string | null,
 *     confidence: string | null,
 *     confidenceScore: number,
 *     filePath: string,
 *     lineNumber: number | null,
 *     snippetHash: string | null,
 *     evidencePayload: object
 *   }
 */
export class FindingCorrelator {
    /**
     * @param {boolean} enabled - If false, returns findings unchanged with single evidence entries.
     */
    constructor({ enabled = true } = {}) {
        this.enabled = enabled;
    }

    /**
     * Correlate a flat list of findings.
     *
     * @param {object[]} findings - Raw findings from all engines (must have fingerprint already set)
     * @returns {{ canonicalFindings: object[], totalRaw: number, duplicatesEliminated: number }}
     */
    correlate(findings) {
        const totalRaw = findings.length;

        if (!this.enabled) {
            // Pass-through: wrap each finding with a single-entry evidence array
            const canonicalFindings = findings.map(f => ({
                ...f,
                corroborationCount: 1,
                corroborationScore: f.confidenceScore || 100,
                evidence: [this._buildEvidence(f)]
            }));
            return { canonicalFindings, totalRaw, duplicatesEliminated: 0 };
        }

        // Group findings by fingerprint
        const groups = new Map();
        for (const finding of findings) {
            const key = finding.fingerprint;
            if (!key) {
                // No fingerprint — cannot correlate, emit as-is
                groups.set(Symbol(), [finding]);
                continue;
            }
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(finding);
        }

        const canonicalFindings = [];
        for (const [, group] of groups) {
            // The canonical finding is the first detected instance
            const canonical = { ...group[0] };
            const evidence = group.map(f => this._buildEvidence(f));

            // Corroboration boost: each additional engine adds 15 confidence points
            const corroborationCount = group.length;
            const baseScore = canonical.confidenceScore || 100;
            const corroborationScore = Math.min(100, baseScore + (corroborationCount - 1) * 15);

            canonical.corroborationCount = corroborationCount;
            canonical.corroborationScore = corroborationScore;
            canonical.evidence = evidence;

            canonicalFindings.push(canonical);
        }

        const duplicatesEliminated = totalRaw - canonicalFindings.length;
        return { canonicalFindings, totalRaw, duplicatesEliminated };
    }

    /**
     * Build a structured evidence entry from a raw finding.
     */
    _buildEvidence(finding) {
        // Compute a lightweight hash of the raw snippet for audit purposes.
        // The actual snippet has already been encrypted and deleted from the finding.
        // We use encryptedSnippet's prefix (first 8 chars) as a lightweight reference.
        const snippetHash = finding.encryptedSnippet
            ? crypto.createHash('sha256')
                .update(finding.encryptedSnippet)
                .digest('hex')
                .slice(0, 16)
            : null;

        return {
            engineId: finding.engine || 'unknown',
            engineVersion: finding.engineVersion || null,
            ruleId: finding.ruleId || null,
            ruleVersion: finding.ruleVersion || null,
            confidence: finding.confidence || null,
            confidenceScore: finding.confidenceScore || 100,
            filePath: finding.filePath,
            lineNumber: finding.lineNumber || null,
            snippetHash,
            evidencePayload: {
                ruleType: finding.ruleType || null,
                vulnerabilityClass: finding.vulnerabilityClass || null,
                cwe: finding.cwe || null,
            }
        };
    }
}
