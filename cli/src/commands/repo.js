import { Command } from 'commander';
import {
    createApiClient,
    resolveWorkspaceId,
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

export const repoCommand = new Command('repo')
    .description('Manage and inspect registered repositories');

// ---------------------------------------------------------------------------
// repo list
// ---------------------------------------------------------------------------
repoCommand
    .command('list')
    .description('List repositories in the active workspace')
    .option('-w, --workspace <id>', 'Workspace ID (or defaults to OCULUS_WORKSPACE_ID)')
    .option('-l, --limit <count>', 'Number of repositories to return', '20')
    .option('--json', 'Emit repository list as JSON')
    .action(async (options) => {
        if (options.json) enableJsonMode();

        const workspaceId = resolveWorkspaceId(options.workspace);
        if (!workspaceId) {
            if (isJsonMode()) {
                printJson({ error: 'Workspace ID is required', items: [] });
            } else {
                printError(color.error('Error: Workspace ID is required.'));
                printError(color.muted('Pass --workspace <id> or set OCULUS_WORKSPACE_ID.'));
            }
            process.exit(1);
        }

        try {
            const client = createApiClient();
            const limit = parseInt(options.limit, 10) || 20;

            if (!isJsonMode()) {
                print(color.info(`Fetching repositories for workspace: ${color.muted(workspaceId)}…`));
            }

            const response = await client.get(`/pagination/repositories/${workspaceId}`, {
                params: { limit },
            });

            const data  = response.data?.data || response.data || {};
            const items = data.items || data.repositories || [];

            if (isJsonMode()) {
                printJson({ workspaceId, total: items.length, items });
                return;
            }

            if (items.length === 0) {
                print(color.warn('\nNo repositories found in this workspace.'));
                return;
            }

            print(color.bold(`\nRepositories (${items.length}):\n`));

            items.forEach((repo, idx) => {
                const gradeFn = color[repo.current_risk_grade] ?? color.muted;
                const score = repo.current_risk_score !== undefined && repo.current_risk_score !== null
                    ? `${repo.current_risk_score}/100`
                    : 'N/A';
                const grade = repo.current_risk_grade || 'N/A';

                const repoName = escapeSensitiveString(repo.full_name || repo.name);
                const branch = escapeSensitiveString(repo.default_branch || 'main');
                const url = escapeSensitiveString(repo.url || '');

                print(`${color.muted(`${idx + 1}.`)} ${color.bold(repoName)} ${gradeFn(`[Grade ${grade}]`)} (${score})`);
                print(`   ${color.muted('ID:')}             ${repo.id}`);
                print(`   ${color.muted('Default Branch:')} ${branch}`);
                if (repo.url) print(`   ${color.muted('URL:')}            ${color.cyan(url)}`);
                print('');
            });
        } catch (error) {
            if (isJsonMode()) {
                printJson({ error: error.response?.data?.message || error.message, items: [] });
            } else {
                handleApiError(error, 'Failed to list repositories');
            }
            process.exit(1);
        }
    });
