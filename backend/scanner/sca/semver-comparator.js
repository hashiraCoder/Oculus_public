/**
 * scanner/sca/semver-comparator.js
 *
 * Semver range matching for SCA advisory comparison.
 *
 * Handles OSV.dev range formats:
 *   - "SEMVER": { introduced: "0", fixed: "4.17.21" }
 *   - "ECOSYSTEM": { introduced: "0", fixed: "4.17.21" }
 *   - Ranges with only 'introduced' (no fixed = still vulnerable)
 *   - Ranges with only 'fixed' (all versions below fixed are vulnerable)
 *   - Multiple ranges per advisory (any match = vulnerable)
 *
 * Spec note: We implement our own semver comparison using integer arithmetic
 * so we do NOT add a new dependency. This keeps the attack surface minimal.
 *
 * No external packages. Pure Node.js.
 */

/**
 * Parse a semver string into a numeric tuple [major, minor, patch, preRelease].
 * Strips npm-style prefixes (^, ~, >=, >, =) and pre-release labels for comparison.
 *
 * @param {string} version
 * @returns {number[]|null}
 */
export function parseVersion(version) {
    if (!version || typeof version !== 'string') return null;

    // Strip semver range operators and whitespace
    const cleaned = version.replace(/[^0-9.]/g, '').trim();
    if (!cleaned) return null;

    const parts = cleaned.split('.');
    return [
        parseInt(parts[0] ?? '0', 10) || 0,
        parseInt(parts[1] ?? '0', 10) || 0,
        parseInt(parts[2] ?? '0', 10) || 0,
    ];
}

/**
 * Compare two parsed version tuples.
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareParsed(a, b) {
    for (let i = 0; i < 3; i++) {
        if (a[i] < b[i]) return -1;
        if (a[i] > b[i]) return 1;
    }
    return 0;
}

/**
 * Check if a package version is affected by an OSV.dev advisory range.
 *
 * OSV range types we support:
 *   SEMVER  — Semantic versioning ranges
 *   ECOSYSTEM — Ecosystem-specific versioning (treated same as SEMVER for npm)
 *   GIT     — Git commit range (not supported, skip)
 *
 * @param {string} installedVersion — e.g. "4.17.20", "^4.17.0", "~1.2.3"
 * @param {object[]} ranges — OSV.dev ranges array from advisory
 * @returns {{ vulnerable: boolean, matchedRange: object|null }}
 */
export function isVersionVulnerable(installedVersion, ranges) {
    if (!ranges?.length) return { vulnerable: false, matchedRange: null };

    const installed = parseVersion(installedVersion);
    if (!installed) return { vulnerable: false, matchedRange: null };

    for (const range of ranges) {
        const type = range.type;
        if (type === 'GIT') continue; // Cannot compare git SHAs against semver

        const events = range.events ?? [];
        let introduced = null;
        let fixed = null;
        let lastAffected = null;

        for (const event of events) {
            if ('introduced' in event) {
                const v = event.introduced === '0' ? [0, 0, 0] : parseVersion(event.introduced);
                if (v) introduced = v;
            }
            if ('fixed' in event) {
                const v = parseVersion(event.fixed);
                if (v) fixed = v;
            }
            if ('last_affected' in event) {
                const v = parseVersion(event.last_affected);
                if (v) lastAffected = v;
            }
        }

        // Determine if installed falls within the vulnerable range
        let inRange = false;

        // Lower bound: installed >= introduced
        if (introduced !== null) {
            if (compareParsed(installed, introduced) < 0) continue; // before introduced, not vulnerable
        }

        // Upper bound:
        //   fixed:         vulnerable if installed < fixed
        //   last_affected: vulnerable if installed <= last_affected
        //   neither:       open-ended — still vulnerable
        if (fixed !== null) {
            inRange = compareParsed(installed, fixed) < 0;
        } else if (lastAffected !== null) {
            inRange = compareParsed(installed, lastAffected) <= 0;
        } else {
            inRange = true; // No upper bound — all versions from 'introduced' are affected
        }

        if (inRange) {
            return { vulnerable: true, matchedRange: range };
        }
    }

    return { vulnerable: false, matchedRange: null };
}

/**
 * Map OSV.dev severity string to Oculus severity enum.
 * OSV severities: CRITICAL, HIGH, MEDIUM, LOW
 * CVSS score also provided in some advisories.
 *
 * @param {object} advisory — OSV.dev advisory object
 * @returns {'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'|'INFORMATIONAL'}
 */
export function mapSeverity(advisory) {
    // Try OSV database_specific severity first (ecosystem-level)
    const dbSeverity = advisory.database_specific?.severity;
    if (dbSeverity) {
        const upper = dbSeverity.toUpperCase();
        if (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(upper)) return upper;
    }

    // Try CVSS score from severity array
    const severities = advisory.severity ?? [];
    for (const sev of severities) {
        if (sev.type === 'CVSS_V3' || sev.type === 'CVSS_V2') {
            const score = parseFloat(sev.score);
            if (!isNaN(score)) {
                if (score >= 9.0) return 'CRITICAL';
                if (score >= 7.0) return 'HIGH';
                if (score >= 4.0) return 'MEDIUM';
                return 'LOW';
            }
        }
    }

    return 'HIGH'; // Conservative default
}
