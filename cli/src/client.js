import axios from 'axios';
import { getConfigValue } from './config-store.js';
import { printError, color } from './output.js';

/**
 * Resolves the active API token.
 * Priority: explicit parameter > OCULUS_TOKEN env var > config store
 * @param {string} [explicitToken]
 * @returns {string|null}
 */
export function resolveToken(explicitToken) {
    if (explicitToken) return explicitToken;
    if (process.env.OCULUS_TOKEN) return process.env.OCULUS_TOKEN;
    return getConfigValue('token', null);
}

/**
 * Resolves the active API URL.
 * Priority: explicit parameter > OCULUS_API_URL env var > config store > default
 * @param {string} [explicitUrl]
 * @returns {string}
 */
export function resolveApiUrl(explicitUrl) {
    if (explicitUrl) return explicitUrl;
    if (process.env.OCULUS_API_URL) return process.env.OCULUS_API_URL;
    return getConfigValue('api-url', 'http://localhost:3000/api/v1');
}

/**
 * Resolves the active Workspace ID.
 * Priority: explicit parameter > OCULUS_WORKSPACE_ID env var > config store
 * @param {string} [explicitWorkspace]
 * @returns {string|null}
 */
export function resolveWorkspaceId(explicitWorkspace) {
    if (explicitWorkspace) return explicitWorkspace;
    if (process.env.OCULUS_WORKSPACE_ID) return process.env.OCULUS_WORKSPACE_ID;
    return getConfigValue('workspace', null);
}

/**
 * Creates an Axios client configured with authorization and base URL.
 * @param {object} [options]
 * @param {string} [options.token]
 * @param {string} [options.apiUrl]
 * @param {boolean} [options.requireAuth=true]
 * @returns {import('axios').AxiosInstance}
 */
export function createApiClient(options = {}) {
    const token = resolveToken(options.token);
    const apiUrl = resolveApiUrl(options.apiUrl);

    if (options.requireAuth !== false && !token) {
        printError(color.error('Error: Authentication required.'));
        printError(color.muted('Please run "oculus auth login --token <token>" or set the OCULUS_TOKEN environment variable.'));
        process.exit(1);
    }

    const headers = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return axios.create({
        baseURL: apiUrl,
        timeout: 30000,
        headers
    });
}

/**
 * Formats and prints an API error to stderr.
 * Respects plain/JSON/rich output mode via output.js.
 * @param {Error|any} error
 * @param {string} [contextMessage]
 */
export function handleApiError(error, contextMessage = 'Command failed') {
    const status = error.response?.status;
    const responseData = error.response?.data;
    const message = responseData?.message || responseData?.error || error.message;

    printError(color.error(`\n${contextMessage}:`));
    if (status) {
        printError(color.error(`HTTP ${status} — ${message}`));
    } else {
        printError(color.error(message));
    }
}
