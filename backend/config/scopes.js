/**
 * DEVELOPER_TOKEN_SCOPES
 * 
 * Canonical definition of all allowed scopes for Developer Tokens.
 * Any scope not defined here should be rejected by the API.
 */
export const DEVELOPER_TOKEN_SCOPES = {
    // Scan Operations
    SCANS_READ: 'scans:read',
    SCANS_CREATE: 'scans:create',
    SCANS_CANCEL: 'scans:cancel',
    SCANS_RETRY: 'scans:retry',

    // Finding Operations
    FINDINGS_READ: 'findings:read',
    FINDINGS_WRITE: 'findings:write',

    // Analytics Operations
    ANALYTICS_READ: 'analytics:read',

    // Export Operations
    EXPORTS_READ: 'exports:read',
};

export const ALLOWED_SCOPES = Object.values(DEVELOPER_TOKEN_SCOPES);

/**
 * Validates an array of scopes against the canonical definitions.
 * @param {string[]} scopes - Array of requested scopes
 * @returns {string[]} Array of invalid scopes (empty if all are valid)
 */
export const validateScopes = (scopes) => {
    if (!Array.isArray(scopes)) return ['invalid_format'];
    return scopes.filter(s => !ALLOWED_SCOPES.includes(s));
};
