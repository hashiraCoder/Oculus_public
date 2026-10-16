import crypto from 'crypto';

/**
 * Fingerprint algorithm version.
 *
 * v1 (original): SHA256(repositoryId + filePath + ruleId + lineNumber + snippetHash)
 *   — UNSTABLE: harmless code movement changes lineNumber → new fingerprint → false "new finding"
 *
 * v2 (current): SHA256('v2:' + repositoryId + filePath + ruleId + normalizedSnippetHash)
 *   — STABLE: same vulnerability pattern survives line movement and minor whitespace changes
 *
 * When the algorithm changes again, increment to v3 and update FINGERPRINT_VERSION.
 * The version prefix is included in the hash input so v2 and v3 hashes can never collide.
 */
const FINGERPRINT_VERSION = 'v2';

/**
 * Normalizes a code snippet for stable fingerprinting.
 * Strips leading/trailing whitespace and collapses internal whitespace runs to single spaces.
 * This ensures that reformatting (without logic change) does not produce a new fingerprint.
 *
 * @param {string} snippet
 * @returns {string}
 */
function normalizeSnippet(snippet) {
    if (!snippet) return '';
    return snippet.trim().replace(/\s+/g, ' ');
}

/**
 * Generates a stable, version-tagged fingerprint for a security finding.
 *
 * Inputs:
 *   - repositoryId: which repository the finding belongs to
 *   - filePath:     relative path within the repository (no absolute paths)
 *   - ruleId:       which rule/engine produced the finding
 *   - snippet:      the code snippet at the finding location
 *
 * NOT included (vs. v1):
 *   - lineNumber: excluded intentionally. Harmless code movement (adding a comment above
 *     a vulnerable line) would change the line number but not the vulnerability. Including
 *     line number caused the system to treat moved-but-unpatched findings as new findings,
 *     polluting the new-finding view and failing idempotent UPSERT logic.
 *
 * @param {string} repositoryId
 * @param {string} filePath
 * @param {string} ruleId
 * @param {string} snippet
 * @returns {string} 64-character hex SHA-256 digest
 */
export const generateFingerprint = (repositoryId, filePath, ruleId, snippet) => {
    const normalizedSnippet = normalizeSnippet(snippet);
    const snippetHash = crypto.createHash('sha256').update(normalizedSnippet).digest('hex');

    const hash = crypto.createHash('sha256');
    hash.update(FINGERPRINT_VERSION);
    hash.update(':');
    hash.update(String(repositoryId));
    hash.update(':');
    hash.update(String(filePath));
    hash.update(':');
    hash.update(String(ruleId));
    hash.update(':');
    hash.update(snippetHash);

    return hash.digest('hex');
};

export { FINGERPRINT_VERSION };
