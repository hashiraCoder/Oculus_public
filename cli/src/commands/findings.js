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

export const findingsCommand = new Command('findings')
    .description('Query and triage security findings');

// ---------------------------------------------------------------------------
// findings list
// ---------------------------------------------------------------------------
findingsCommand
    .command('list')
    .description('List security findings for a workspace')
    .option('-w, --workspace <id>', 'Workspace ID (or defaults to OCULUS_WORKSPACE_ID)')
    .option('-r, --repository <id>', 'Filter by Repository ID')
    .option('-s, --severity <levels...>', 'Filter by severity (CRITICAL, HIGH, MEDIUM, LOW)')
    .option('--status <status...>', 'Filter by status (OPEN, CONFIRMED, FALSE_POSITIVE, FIXED, IGNORED)')
    .option('-l, --limit <count>', 'Number of findings to return', '20')
    .option('--json', 'Emit findings as JSON array')
    .action(async (options) => {
        if (options.json) enableJsonMode();

        const workspaceId = resolveWorkspaceId(options.workspace);
        if (!workspaceId) {
            if (isJsonMode()) {
                printJson({ error: 'Workspace ID is required', items: [] });
            } else {
                printError(color.error('Error: Workspace ID is required.'));
                printError(color.muted('Pass --workspace <id> or set OCULUS_WORKSPACE_ID or run "oculus config set workspace <id>".'));
            }
            process.exit(1);
        }

        try {
            const client = createApiClient();
            const params = { limit: parseInt(options.limit, 10) || 20 };

            if (options.repository) params.repositoryId = options.repository;
            if (options.severity)   params.severity = options.severity;
            if (options.status)     params.status = options.status;

            if (!isJsonMode()) {
                print(color.info(`Fetching findings for workspace: ${color.muted(workspaceId)}…`));
            }

            const response = await client.get(`/findings/${workspaceId}`, { params });
            const data = response.data?.data || response.data || {};
            const items = data.items || [];

            if (isJsonMode()) {
                printJson({ workspaceId, total: items.length, items });
                return;
            }

            if (items.length === 0) {
                print(color.success('\n✓ No findings found matching criteria.'));
                return;
            }

            print(color.bold(`\nFound ${items.length} finding(s):\n`));

            items.forEach((finding, idx) => {
                const sevFn = color[finding.severity] ?? ((s) => s);
                const statusColors = {
                    OPEN:           color.error,
                    CONFIRMED:      color.magenta,
                    FALSE_POSITIVE: color.muted,
                    FIXED:          color.success,
                    IGNORED:        color.warn,
                };
                const statusFn = statusColors[finding.status] ?? ((s) => s);

                const ruleName = escapeSensitiveString(finding.rule_type || finding.ruleId || 'Security Finding');
                const filePath = escapeSensitiveString(finding.file_path || 'unknown');

                print(`${color.muted(`${idx + 1}.`)} ${sevFn(`[${finding.severity}]`)} ${color.bold(ruleName)} ${statusFn(`(${finding.status})`)}`);
                print(`   ${color.muted('ID:')}       ${finding.id}`);
                print(`   ${color.muted('Location:')} ${color.cyan(filePath)}:${finding.line_number || '1'}`);
                if (finding.engine) print(`   ${color.muted('Engine:')}   ${escapeSensitiveString(finding.engine)}`);
                print('');
            });
        } catch (error) {
            if (isJsonMode()) {
                printJson({ error: error.response?.data?.message || error.message, items: [] });
            } else {
                handleApiError(error, 'Failed to fetch findings');
            }
            process.exit(1);
        }
    });

// ---------------------------------------------------------------------------
// findings update
// ---------------------------------------------------------------------------
findingsCommand
    .command('update')
    .description('Update the status of a specific finding (triage)')
    .argument('<findingId>', 'ID of the finding to update')
    .requiredOption('-s, --status <status>', 'New status (OPEN, CONFIRMED, FALSE_POSITIVE, FIXED, IGNORED)')
    .option('-w, --workspace <id>', 'Workspace ID (or defaults to OCULUS_WORKSPACE_ID)')
    .option('-c, --comment <text>', 'Audit trail comment')
    .option('--json', 'Emit result as JSON')
    .action(async (findingId, options) => {
        if (options.json) enableJsonMode();

        const workspaceId = resolveWorkspaceId(options.workspace);
        if (!workspaceId) {
            if (isJsonMode()) {
                printJson({ success: false, error: 'Workspace ID is required' });
            } else {
                printError(color.error('Error: Workspace ID is required.'));
                printError(color.muted('Pass --workspace <id> or set OCULUS_WORKSPACE_ID.'));
            }
            process.exit(1);
        }

        const validStatuses = ['OPEN', 'CONFIRMED', 'FALSE_POSITIVE', 'FIXED', 'IGNORED'];
        const targetStatus = options.status.toUpperCase();
        if (!validStatuses.includes(targetStatus)) {
            if (isJsonMode()) {
                printJson({ success: false, error: `Invalid status "${options.status}". Valid: ${validStatuses.join(', ')}` });
            } else {
                printError(color.error(`Error: Invalid status "${options.status}". Valid values: ${validStatuses.join(', ')}`));
            }
            process.exit(1);
        }

        try {
            const client = createApiClient();
            await client.patch(`/findings/${workspaceId}/${findingId}/status`, {
                status: targetStatus,
                comment: options.comment || `Updated via Oculus CLI to ${targetStatus}`,
            });

            if (isJsonMode()) {
                printJson({ success: true, findingId, status: targetStatus });
            } else {
                print(color.success(`\n✓ Finding ${findingId} status successfully updated to ${color.bold(targetStatus)}.`));
            }
        } catch (error) {
            if (isJsonMode()) {
                printJson({ success: false, findingId, error: error.response?.data?.message || error.message });
            } else {
                handleApiError(error, 'Failed to update finding status');
            }
            process.exit(1);
        }
    });
