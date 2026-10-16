import GithubCheckService from './github-check.service.js';
import { getPool } from '../../config/db.js';
import NotificationService from '../../notifications/notification.service.js';
import logger from '../../config/logger.js';

class GithubStatusService {
    static async handleStatusUpdate(payload) {
        const { scanId, eventType, payload: data } = payload;
        const { installationId, owner, repo, headSha, conclusion, output, repositoryId, workspaceId } = data;
        
        const pool = getPool();
        
        const numericInstallationId = (installationId && !isNaN(Number(installationId))) ? Number(installationId) : null;
        
        try {
            if (eventType === 'scan_started') {
                if (numericInstallationId) {
                    // 1. Check if Check Run already exists for this scan_id (idempotency guard)
                    const existingRes = await pool.query(
                        `SELECT github_check_id FROM github_check_runs WHERE scan_id = $1 LIMIT 1`,
                        [scanId]
                    );

                    let checkRunId = existingRes.rows[0]?.github_check_id;

                    if (!checkRunId) {
                        // 2. Create GitHub Check Run
                        const checkRun = await GithubCheckService.createCheckRun({
                            installationId: numericInstallationId, owner, repo, headSha, status: 'in_progress'
                        });
                        checkRunId = checkRun.id;

                        // 3. Store in github_check_runs
                        await pool.query(`
                            INSERT INTO github_check_runs (scan_id, github_check_id, repository_id, head_sha, status, started_at)
                            VALUES ($1, $2, $3, $4, 'in_progress', NOW())
                            ON CONFLICT (scan_id) DO UPDATE
                            SET github_check_id = EXCLUDED.github_check_id,
                                status = 'in_progress',
                                updated_at = NOW()
                        `, [scanId, checkRun.id, repositoryId, headSha]);

                        // 4. Log action
                        await pool.query(`
                            INSERT INTO github_action_logs (scan_id, installation_id, repository_id, github_check_run_id, action, status, response_code)
                            VALUES ($1, $2, $3, $4, 'create_check_run', 'SUCCESS', 201)
                        `, [scanId, numericInstallationId, repositoryId, checkRun.id]);
                    } else {
                        logger.info(`[GithubStatusService] Check Run already exists for scan ${scanId} (checkId: ${checkRunId}), skipping creation.`);
                    }
                }

                // 5. Publish Notification
                await NotificationService.publishScanStarted(workspaceId, repositoryId, repo, scanId);

            } else if (eventType === 'scan_completed' || eventType === 'scan_failed') {
                let formattedOutput = output;
                if (eventType === 'scan_completed') {
                    formattedOutput = await this.generateCheckRunOutput(scanId, output);
                }

                if (numericInstallationId) {
                    // 1. Get existing Check Run ID
                    const checkRunRes = await pool.query(`
                        SELECT github_check_id FROM github_check_runs WHERE scan_id = $1 LIMIT 1
                    `, [scanId]);

                    let checkRunId;
                    if (checkRunRes.rows.length === 0) {
                        // Create if not found
                        const checkRun = await GithubCheckService.createCheckRun({
                            installationId: numericInstallationId, owner, repo, headSha, status: 'in_progress'
                        });
                        checkRunId = checkRun.id;
                        await pool.query(`
                            INSERT INTO github_check_runs (scan_id, github_check_id, repository_id, head_sha, status, started_at)
                            VALUES ($1, $2, $3, $4, 'in_progress', NOW())
                            ON CONFLICT (scan_id) DO UPDATE
                            SET github_check_id = EXCLUDED.github_check_id,
                                updated_at = NOW()
                        `, [scanId, checkRunId, repositoryId, headSha]);
                    } else {
                        checkRunId = checkRunRes.rows[0].github_check_id;
                    }

                    // 3. Complete Check Run
                    await GithubCheckService.completeCheckRun({
                        installationId: numericInstallationId, owner, repo, checkRunId, conclusion, output: formattedOutput
                    });

                    // 4. Update github_check_runs
                    await pool.query(`
                        UPDATE github_check_runs
                        SET status = 'completed', conclusion = $2, completed_at = NOW()
                        WHERE github_check_id = $1
                    `, [checkRunId, conclusion]);

                    // 5. Log action
                    await pool.query(`
                        INSERT INTO github_action_logs (scan_id, installation_id, repository_id, github_check_run_id, action, status, response_code)
                        VALUES ($1, $2, $3, $4, 'complete_check_run', 'SUCCESS', 200)
                    `, [scanId, numericInstallationId, repositoryId, checkRunId]);
                }

                // 6. Publish Notification
                if (eventType === 'scan_completed') {
                    await NotificationService.publishScanCompleted(workspaceId, repositoryId, repo, scanId, {
                        status: 'COMPLETED',
                        riskScore: formattedOutput.riskScore,
                        criticalCount: formattedOutput.severityCounts.CRITICAL,
                        highCount: formattedOutput.severityCounts.HIGH,
                        mediumCount: formattedOutput.severityCounts.MEDIUM,
                        lowCount: formattedOutput.severityCounts.LOW
                    });
                } else {
                    await NotificationService.publishScanFailed(workspaceId, repositoryId, repo, scanId, output?.text || 'Scan failed.');
                }
            }
        } catch (error) {
            logger.error(`[GithubStatusService] Error handling status update: ${error.message}`, error);
            
            // Log failure only if valid installationId is present
            if (numericInstallationId) {
                await pool.query(`
                    INSERT INTO github_action_logs (scan_id, installation_id, repository_id, action, status, error_message)
                    VALUES ($1, $2, $3, $4, 'ERROR', $5)
                `, [scanId, numericInstallationId, repositoryId, eventType, error.message]).catch(() => {});
            }

            throw error;
        }
    }

    static async generateCheckRunOutput(scanId, defaultOutput) {
        const pool = getPool();
        const res = await pool.query(`
            SELECT id, rule_type, severity, file_path, line_number 
            FROM vulnerabilities 
            WHERE scan_id = $1 AND status = 'OPEN'
        `, [scanId]);

        const vulnerabilities = res.rows;
        
        // Priority Sorting mapping
        const severityWeight = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        vulnerabilities.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);

        const severityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
        vulnerabilities.forEach(v => {
            if (severityCounts[v.severity] !== undefined) severityCounts[v.severity]++;
        });

        // Calculate Risk Score (out of 100) aligned with canonical RiskScoreService defaults:
        // CRITICAL = -40, HIGH = -20, MEDIUM = -5, LOW = -1
        let riskDeduction = (severityCounts.CRITICAL * 40) + (severityCounts.HIGH * 20) + (severityCounts.MEDIUM * 5) + (severityCounts.LOW * 1);
        const riskScore = Math.max(0, 100 - riskDeduction);

        let riskLevel = 'LOW';
        if (riskScore < 50) riskLevel = 'CRITICAL';
        else if (riskScore < 70) riskLevel = 'HIGH';
        else if (riskScore < 80) riskLevel = 'MEDIUM';
        else if (riskScore < 90) riskLevel = 'LOW';

        // Select top 50 for annotations
        const top50 = vulnerabilities.slice(0, 50);

        const annotations = top50.map(v => {
            let annotation_level = 'notice';
            if (v.severity === 'CRITICAL' || v.severity === 'HIGH') annotation_level = 'failure';
            else if (v.severity === 'MEDIUM') annotation_level = 'warning';

            return {
                path: v.file_path,
                start_line: v.line_number,
                end_line: v.line_number,
                annotation_level,
                message: `[${v.severity}] Found potential ${v.rule_type} leak. Check Oculus dashboard for details.`
            };
        });

        // Professional Summary
        const scanData = await pool.query(`SELECT duration_ms FROM scans WHERE id = $1`, [scanId]);
        const durationSecs = ((scanData.rows[0]?.duration_ms || 0) / 1000).toFixed(2);

        const text = `
### Security Scan Summary
- **Risk Score**: ${riskScore}/100
- **Risk Level**: ${riskLevel}
- **Duration**: ${durationSecs} sec

### Findings Breakdown
- **CRITICAL**: ${severityCounts.CRITICAL}
- **HIGH**: ${severityCounts.HIGH}
- **MEDIUM**: ${severityCounts.MEDIUM}
- **LOW**: ${severityCounts.LOW}

${vulnerabilities.length > 50 ? '*Showing first 50 findings. More findings available in Oculus dashboard.*' : ''}
        `;

        return {
            title: `Oculus Scan: ${riskScore}/100`,
            summary: defaultOutput?.summary || `Completed scan with ${vulnerabilities.length} findings.`,
            text,
            annotations,
            riskScore,
            severityCounts
        };
    }
}

export default GithubStatusService;
