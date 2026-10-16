import { Command } from 'commander';
import {
    createApiClient,
    handleApiError,
} from '../client.js';
import {
    print,
    printError,
    printJson,
    printProgress,
    enableJsonMode,
    isJsonMode,
    color,
} from '../output.js';

export const scanCommand = new Command('scan')
    .description('Trigger a security scan and optionally evaluate the security gate')
    .requiredOption('-r, --repository <id>', 'ID of the repository to scan')
    .requiredOption('-b, --branch <name>', 'Branch name to scan')
    .option('-c, --commit <sha>', 'Specific commit SHA to scan (optional)')
    .option('-w, --wait', 'Wait for scan completion and exit with security gate code')
    .option('--poll-interval <seconds>', 'Polling interval in seconds when waiting', '5')
    .option('--timeout <seconds>', 'Maximum seconds to wait for scan completion', '300')
    .option('--verbose', 'Show detailed progress during --wait polling')
    .option('--json', 'Emit final result as JSON (implies non-interactive output)')
    .option('--token <token>', 'Override authentication token')
    .option('--api-url <url>', 'Override backend API URL')
    .action(async (options) => {
        if (options.json) enableJsonMode();

        const client = createApiClient({
            token: options.token,
            apiUrl: options.apiUrl,
        });

        // Declared at outer scope so the SIGINT handler can reference it
        let scanId = null;

        // ---------------------------------------------------------------------------
        // SIGINT handler — fires on Ctrl+C during --wait polling
        // ---------------------------------------------------------------------------
        process.on('SIGINT', () => {
            process.stdout.write('\n');
            if (isJsonMode()) {
                printJson({
                    interrupted: true,
                    scanId: scanId || null,
                    message: 'Scan is still running on the backend.',
                });
            } else {
                printError(color.warn('\nInterrupted by user (Ctrl+C).'));
                printError(color.muted('The scan is still running on the backend.'));
                if (scanId) {
                    printError(color.muted(`Scan ID: ${scanId}`));
                    printError(color.muted('Poll status manually: GET /api/v1/scans/' + scanId + '/gate'));
                }
            }
            process.exit(130); // Standard Unix convention for SIGINT
        });

        try {
            if (!isJsonMode()) {
                print(color.info('Triggering Oculus security scan…'));
            }

            const response = await client.post('/scans', {
                repositoryId: options.repository,
                branch: options.branch,
                commitSha: options.commit,
            });

            const scanData = response.data?.data || response.data || {};
            scanId = scanData.id || scanData.scanId;

            if (!isJsonMode()) {
                print(color.success('\n✓ Scan successfully queued!'));
                print(`  ${color.muted('Scan ID:')} ${color.bold(scanId)}`);
                print(`  ${color.muted('Branch:')}  ${color.cyan(options.branch)}`);
                if (options.commit) {
                    print(`  ${color.muted('Commit:')}  ${color.muted(options.commit)}`);
                }
            }

            if (!options.wait) {
                if (isJsonMode()) {
                    printJson({ queued: true, scanId, branch: options.branch, commitSha: options.commit ?? null });
                } else {
                    print(color.warn('\nSkipping wait. Exiting with success code 0.'));
                }
                process.exit(0);
            }

            if (!isJsonMode()) {
                print(color.info('\nWaiting for scan execution and security gate evaluation…'));
            }

            const pollIntervalMs = Math.max(1000, (parseInt(options.pollInterval, 10) || 5) * 1000);
            const timeoutMs = (parseInt(options.timeout, 10) || 300) * 1000;
            const startTime = Date.now();

            while (true) {
                if (Date.now() - startTime > timeoutMs) {
                    if (isJsonMode()) {
                        printJson({ scanId, status: 'TIMEOUT', gate: null, error: `Timed out after ${options.timeout}s` });
                    } else {
                        printError(color.error(`\nTimed out after ${options.timeout}s waiting for scan to complete.`));
                    }
                    process.exit(1);
                }

                await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

                try {
                    const gateResponse = await client.get(`/scans/${scanId}/gate`);
                    const gateData = gateResponse.data?.data || gateResponse.data || {};
                    const { execution, gate } = gateData;

                    if (!execution) {
                        printProgress(color.muted('.'));
                        continue;
                    }

                    const inProgress = ['QUEUED', 'DISPATCHED', 'ACQUIRING_SOURCE', 'ANALYZING', 'PERSISTING', 'SCANNING'];
                    if (inProgress.includes(execution.status)) {
                        if (options.verbose && !isJsonMode()) {
                            printProgress(color.muted(`.`));
                        } else if (!isJsonMode()) {
                            printProgress(color.muted('.'));
                        }
                        continue;
                    }

                    // Terminal state reached
                    if (!isJsonMode()) process.stdout.write('\n');

                    if (execution.status === 'CANCELLED') {
                        if (isJsonMode()) {
                            printJson({ scanId, status: 'CANCELLED', gate: null });
                        } else {
                            printError(color.warn('Scan was cancelled.'));
                        }
                        process.exit(1);
                    }

                    if (execution.status === 'FAILED' || execution.status === 'TIMEOUT') {
                        if (isJsonMode()) {
                            printJson({ scanId, status: execution.status, gate: null, error: execution.error ?? null });
                        } else {
                            printError(color.error(`Scan execution status: ${execution.status}`));
                            if (execution.error) printError(color.muted(execution.error));
                        }
                        process.exit(1);
                    }

                    if (execution.status === 'COMPLETED') {
                        const passed = gate?.status === 'PASSED';

                        if (isJsonMode()) {
                            printJson({
                                scanId,
                                status: 'COMPLETED',
                                gate: {
                                    status: gate?.status ?? 'UNKNOWN',
                                    passed,
                                    reason: gate?.reason ?? null,
                                },
                            });
                        } else {
                            print(`${color.bold('Scan Execution:')} ${color.success('COMPLETED')}`);
                            if (passed) {
                                print(`${color.bold('Security Gate:')} ${color.success('PASSED')}`);
                                if (gate.reason) print(color.muted(`Reason: ${gate.reason}`));
                            } else {
                                printError(`${color.bold('Security Gate:')} ${color.error('FAILED')}`);
                                if (gate?.reason) printError(color.muted(`Reason: ${gate.reason}`));
                            }
                        }

                        process.exit(passed ? 0 : 1);
                    }
                } catch (pollError) {
                    // Suppress intermittent network blips — print ! and continue
                    printProgress(color.warn('!'));
                }
            }
        } catch (error) {
            if (isJsonMode()) {
                const status = error.response?.status ?? null;
                const message = error.response?.data?.message || error.response?.data?.error || error.message;
                printJson({ queued: false, scanId: null, error: message, httpStatus: status });
            } else {
                handleApiError(error, 'Failed to trigger scan');
            }
            process.exit(1);
        }
    });
