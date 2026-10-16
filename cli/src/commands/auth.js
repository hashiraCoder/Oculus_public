import { Command } from 'commander';
import {
    setConfigValue,
    removeConfigValue,
    loadConfig,
    markTokenSaved,
} from '../config-store.js';
import {
    resolveToken,
    resolveApiUrl,
    createApiClient,
    handleApiError,
} from '../client.js';
import {
    print,
    printError,
    printJson,
    enableJsonMode,
    isJsonMode,
    color,
    escapeSensitiveString,
} from '../output.js';

export const authCommand = new Command('auth')
    .description('Manage CLI authentication credentials');

// ---------------------------------------------------------------------------
// auth login
// ---------------------------------------------------------------------------
authCommand
    .command('login')
    .description('Configure authentication credentials with a developer token')
    .requiredOption('-t, --token <token>', 'Developer token (ocx_live_...)')
    .option('--api-url <url>', 'Backend API URL (optional)')
    .option('--no-verify', 'Skip online token verification after saving')
    .action(async (options) => {
        const token = options.token.trim();

        if (!token.startsWith('ocx_live_')) {
            print(color.warn('Warning: Token does not match the standard developer token prefix (ocx_live_).'));
        }

        // Persist locally first so createApiClient can resolve it.
        setConfigValue('token', token);
        markTokenSaved(); // triggers the one-time plaintext security notice
        if (options.apiUrl) {
            setConfigValue('api-url', options.apiUrl.trim());
        }

        const apiUrl = resolveApiUrl(options.apiUrl);

        // Online verification (skipped only if --no-verify is passed)
        if (options.verify !== false) {
            print(color.info(`Verifying token against ${apiUrl} …`));
            try {
                const client = createApiClient();
                await client.get('/workspaces');
                print(color.success('✓ Authentication token saved and verified successfully.'));
                print(color.muted(`API URL: ${apiUrl}`));
            } catch (err) {
                const status = err.response?.status;
                if (status === 401 || status === 403) {
                    // Invalid token — remove it so user is not left with bad creds
                    removeConfigValue('token');
                    printError(color.error('Error: Token rejected by the server (HTTP ' + status + ').'));
                    printError(color.muted('The token was NOT saved. Check your developer token and try again.'));
                    process.exit(1);
                } else {
                    // Network unreachable — save anyway with a warning
                    print(color.warn('⚠ Token saved but could not be verified — server unreachable.'));
                    print(color.muted(`API URL: ${apiUrl}`));
                    print(color.muted('Run "oculus auth status" once the server is accessible to confirm validity.'));
                }
            }
        } else {
            print(color.success('✓ Authentication token saved (verification skipped).'));
            print(color.muted(`API URL: ${apiUrl}`));
        }
    });

// ---------------------------------------------------------------------------
// auth status
// ---------------------------------------------------------------------------
authCommand
    .command('status')
    .description('Verify current authentication status against the backend')
    .option('--json', 'Emit result as JSON')
    .action(async (options) => {
        if (options.json) enableJsonMode();

        const token = resolveToken();
        const apiUrl = resolveApiUrl();

        if (!token) {
            if (isJsonMode()) {
                printJson({ authenticated: false, reason: 'No token configured' });
            } else {
                print(color.warn('Not authenticated.'));
                print(color.muted('Run "oculus auth login --token <token>" to authenticate.'));
            }
            process.exit(0);
        }

        if (!isJsonMode()) {
            print(color.info('Checking authentication status…'));
            print(color.muted(`API URL: ${apiUrl}`));
            print(color.muted(`Token:   ${token.substring(0, 16)}…`));
        }

        try {
            const client = createApiClient();
            const response = await client.get('/workspaces');
            const workspaces = response.data?.data || response.data || [];

            if (isJsonMode()) {
                printJson({
                    authenticated: true,
                    apiUrl,
                    workspaces: Array.isArray(workspaces) ? workspaces : [],
                });
            } else {
                print(color.success('\n✓ Authenticated successfully!'));
                if (Array.isArray(workspaces) && workspaces.length > 0) {
                    print(color.bold('\nAccessible Workspaces:'));
                    workspaces.forEach(w => {
                        const wsName = escapeSensitiveString(w.name || w.id);
                        print(`  • ${color.cyan(wsName)} (ID: ${color.muted(w.id)})`);
                    });
                }
            }
        } catch (error) {
            if (isJsonMode()) {
                printJson({
                    authenticated: false,
                    reason: error.response?.data?.message || error.message,
                    httpStatus: error.response?.status ?? null,
                });
                process.exit(1);
            }
            handleApiError(error, 'Authentication verification failed');
            process.exit(1);
        }
    });

// ---------------------------------------------------------------------------
// auth logout
// ---------------------------------------------------------------------------
authCommand
    .command('logout')
    .description('Clear stored authentication credentials (attempts server-side revocation)')
    .action(async () => {
        const token = resolveToken();

        if (!token) {
            print(color.warn('No token is currently stored.'));
            process.exit(0);
        }

        // Attempt server-side revocation — gracefully degrade if endpoint absent
        try {
            const client = createApiClient();
            await client.delete('/developer-tokens/current');
            print(color.success('✓ Token revoked on server.'));
        } catch (err) {
            const status = err.response?.status;
            if (status === 404 || status === 501) {
                // Endpoint not implemented — acceptable, skip silently
            } else if (!err.response) {
                print(color.warn('⚠ Server unreachable — token revocation skipped.'));
            } else {
                print(color.warn(`⚠ Server revocation returned HTTP ${status} — continuing with local logout.`));
            }
        }

        removeConfigValue('token');
        print(color.success('✓ Stored authentication token removed.'));
    });
