import { SandboxManager } from '../sandbox/sandbox-manager.js';
import { getPool } from '../../config/db.js';
import { ScanTelemetry } from '../telemetry/telemetry.js';
import { transformToCanonicalTelemetry } from '../telemetry/telemetry-transformer.js';
import { ScanLifecycle } from '../lifecycle/scan-lifecycle.js';
import { FindingCorrelator } from '../correlation/finding-correlator.js';

export class ScanOrchestratorService {
    static async executeScan(scanId, repositoryId, prFiles, workspaceId, isBaseline = false, githubIdentityId = null, githubData = {}) {
        const pool = getPool();
        const client = await pool.connect();
        
        // 1. Fetch repository config
        let resourceLimits = {};
        let eligibilityOverrides = {};
        try {
            const repoConfig = await client.query(`SELECT resource_limits, eligibility_overrides FROM repositories WHERE id = $1`, [repositoryId]);
            if (repoConfig.rows.length > 0) {
                resourceLimits = repoConfig.rows[0].resource_limits || {};
                eligibilityOverrides = repoConfig.rows[0].eligibility_overrides || {};
            }
        } catch (err) {
            console.error(`[ScanOrchestrator] Failed to fetch repository config for ${repositoryId}`, err);
        }

        // IDEMPOTENCY GUARD: If the scan already reached a terminal state (e.g., a previous BullMQ
        // attempt persisted successfully), do not re-run analysis. This prevents the illegal
        // state transition COMPLETED → ANALYZING and avoids double-counting findings.
        try {
            const stateCheck = await client.query(`SELECT status FROM scans WHERE id = $1`, [scanId]);
            const currentStatus = stateCheck.rows[0]?.status;
            const TERMINAL_STATES = ['COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT'];
            if (TERMINAL_STATES.includes(currentStatus)) {
                console.warn(`[ScanOrchestrator] Scan ${scanId} is already in terminal state ${currentStatus}. Skipping re-execution (idempotency guard).`);
                client.release();
                return { status: currentStatus, summary: `Scan already completed (${currentStatus})`, findingsCount: 0, durationMs: 0 };
            }
        } catch (err) {
            console.error(`[ScanOrchestrator] Failed to check scan state for idempotency guard, proceeding:`, err);
        }

        // 2. Prepare job data
        const jobData = {
            scanId,
            repositoryId,
            prFiles,
            isBaseline,
            limits: resourceLimits,
            eligibilityOverrides
        };

        let scanResultStatus = 'PASSED';
        let findings = [];
        let errorMsg = null;

        // Declare here so both the analysis block and the persistence block can access them.
        // Declaring inside the else{} block with const was a block-scoping bug: the persistence
        // section below is outside that block, causing ReferenceError on every scan execution.
        let shadowComparison = null;
        let incrementalStats = null;

        try {
            await ScanLifecycle.transition(scanId, 'ANALYZING');
            await client.query(
                `INSERT INTO scan_logs (scan_id, level, message) VALUES ($1, 'info', $2)`,
                [scanId, 'Scan started.']
            );
        } catch (e) {
            client.release();
            throw e;
        }

        const startTime = Date.now();
        let rawEvaluations = [];
        const stageRecords = [];

        try {
            // Check for cancellation before executing sandbox
            const cancelCheck = await client.query(`SELECT cancel_requested FROM scans WHERE id = $1`, [scanId]);
            
            if (cancelCheck.rows[0]?.cancel_requested) {
                scanResultStatus = 'CANCELLED';
                errorMsg = 'Scan was cancelled by user';
            } else {
                // 3. Execute Sandbox
                const result = await SandboxManager.executeScan(jobData);
                const rawFindings = result.findings || [];
                const metrics = result.metrics || {};
                // Assign to outer-scoped lets so the persistence section can use them.
                shadowComparison = result.shadowComparison || null;
                incrementalStats = result.incrementalStats || null;
                rawEvaluations = metrics.telemetry || [];

                if (incrementalStats?.mode === 'incremental') {
                    console.log(`[INCREMENTAL_PLAN] scanId:${scanId} mode:incremental total:${incrementalStats.totalFiles} affected:${incrementalStats.affectedFiles} skipped:${incrementalStats.skippedFiles} cacheHits:${incrementalStats.cacheHits}`);
                }

                // 4. Correlate findings: deduplicate across engines, build evidence
                const correlationStartTime = Date.now();
                const correlationEnabled = process.env.ENABLE_FINDING_CORRELATION !== 'false';
                const correlator = new FindingCorrelator({ enabled: correlationEnabled });
                const { canonicalFindings, totalRaw, duplicatesEliminated } = correlator.correlate(rawFindings);
                findings = canonicalFindings;
                const correlationDurationMs = Date.now() - correlationStartTime;

                stageRecords.push({
                    stageName: 'CORRELATION',
                    status: 'SUCCESS',
                    durationMs: correlationDurationMs,
                    findingsProduced: findings.length,
                    metadata: { totalRaw, duplicatesEliminated }
                });

                if (duplicatesEliminated > 0) {
                    console.log(`[CORRELATOR] scanId:${scanId} totalRaw:${totalRaw} canonical:${findings.length} duplicatesEliminated:${duplicatesEliminated}`);
                }

                if (prFiles.length > 0 && metrics.eligibleSourceFiles === 0) {
                    const error = new Error('No eligible files were available for analysis.');
                    error.sourceFailureCategory = 'NO_ELIGIBLE_FILES';
                    throw error;
                }
                
                console.log(`[SANDBOX_COMPLETED] scanId:${scanId} duration:${Date.now() - startTime} findingsCount:${findings.length}`);
                await client.query(
                    `INSERT INTO scan_logs (scan_id, level, message) VALUES ($1, 'info', $2)`,
                    [scanId, `Analysis completed. Found ${findings.length} vulnerabilities across ${prFiles.length} files.`]
                );
                
                if (findings.length > 0) {
                    scanResultStatus = 'FAILED';
                }
            }
        } catch (error) {
            scanResultStatus = 'FAILED';
            errorMsg = error.message;
        }

        const durationMs = Date.now() - startTime;
        const finalStatus = scanResultStatus === 'CANCELLED' 
            ? 'CANCELLED' 
            : (errorMsg ? 'FAILED' : 'COMPLETED');
        const finalConclusion = scanResultStatus === 'CANCELLED' ? 'CANCELLED'
            : errorMsg ? 'ERROR'
            : findings.length > 0 ? 'FAIL'
            : 'PASS';
        
        const persistenceStartTime = Date.now();
        try {
            await ScanLifecycle.transition(scanId, 'PERSISTING');
            await client.query('BEGIN');
            
            // 3. Batched Vulnerabilities Upsert
            const vulnIdByFingerprint = new Map();
            let newFindingsInsertedCount = 0;
            const VULN_BATCH_SIZE = 100;

            for (let i = 0; i < findings.length; i += VULN_BATCH_SIZE) {
                const chunk = findings.slice(i, i + VULN_BATCH_SIZE);
                const values = [];
                const valueClauses = [];
                let paramIdx = 1;

                for (const f of chunk) {
                    valueClauses.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5}, $${paramIdx + 6}, $${paramIdx + 7}, $${paramIdx + 8}, $${paramIdx + 9}, $${paramIdx + 10}, $${paramIdx + 11}, $${paramIdx + 12}, $${paramIdx + 13}, $${paramIdx + 14}, 'OPEN', $${paramIdx + 15})`);
                    values.push(
                        scanId,
                        f.ruleType || 'SAST',
                        f.engine || null,
                        f.engineVersion || null,
                        f.ruleId || null,
                        f.ruleVersion || null,
                        f.cwe || null,
                        f.severity,
                        f.confidence || null,
                        f.vulnerabilityClass || null,
                        f.filePath,
                        f.lineNumber || null,
                        f.encryptedSnippet,
                        f.fingerprint,
                        f.corroborationScore || f.confidenceScore || 100,
                        githubIdentityId
                    );
                    paramIdx += 16;
                }

                if (valueClauses.length > 0) {
                    const vulnUpsertSql = `
                        INSERT INTO vulnerabilities (
                            scan_id, rule_type, engine, engine_version, rule_id, rule_version, cwe,
                            severity, confidence, vulnerability_class, file_path, line_number,
                            encrypted_snippet, fingerprint, confidence_score, status, introduced_by_github_identity_id
                        ) VALUES ${valueClauses.join(', ')}
                        ON CONFLICT (fingerprint) DO UPDATE SET 
                            scan_id = EXCLUDED.scan_id,
                            engine = EXCLUDED.engine,
                            engine_version = EXCLUDED.engine_version,
                            rule_version = EXCLUDED.rule_version,
                            confidence = EXCLUDED.confidence,
                            confidence_score = GREATEST(vulnerabilities.confidence_score, EXCLUDED.confidence_score),
                            last_detected_at = CURRENT_TIMESTAMP,
                            number_of_occurrences = vulnerabilities.number_of_occurrences + 1,
                            status = CASE 
                                WHEN vulnerabilities.status = 'FIXED' THEN 'OPEN' 
                                ELSE vulnerabilities.status 
                            END,
                            resolved = CASE 
                                WHEN vulnerabilities.status = 'FIXED' THEN false 
                                ELSE vulnerabilities.resolved 
                            END
                        RETURNING id, fingerprint, (xmax = 0) AS is_insert
                    `;

                    const res = await client.query(vulnUpsertSql, values);
                    for (const row of res.rows) {
                        vulnIdByFingerprint.set(row.fingerprint, row.id);
                        if (row.is_insert) {
                            newFindingsInsertedCount++;
                        }
                    }
                }
            }

            // 4. Batched Finding Evidence Inserts
            const allEvidenceRows = [];
            for (const finding of findings) {
                const vulnId = vulnIdByFingerprint.get(finding.fingerprint);
                if (vulnId && finding.evidence?.length) {
                    for (const ev of finding.evidence) {
                        allEvidenceRows.push({
                            vulnId,
                            engineId: ev.engineId,
                            engineVersion: ev.engineVersion || null,
                            ruleId: ev.ruleId || null,
                            ruleVersion: ev.ruleVersion || null,
                            confidence: ev.confidence || null,
                            confidenceScore: ev.confidenceScore || 100,
                            filePath: ev.filePath,
                            lineNumber: ev.lineNumber || null,
                            snippetHash: ev.snippetHash || null,
                            evidencePayload: ev.evidencePayload || {}
                        });
                    }
                }
            }

            const EVIDENCE_BATCH_SIZE = 200;
            for (let i = 0; i < allEvidenceRows.length; i += EVIDENCE_BATCH_SIZE) {
                const chunk = allEvidenceRows.slice(i, i + EVIDENCE_BATCH_SIZE);
                const values = [];
                const valueClauses = [];
                let paramIdx = 1;

                for (const ev of chunk) {
                    valueClauses.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5}, $${paramIdx + 6}, $${paramIdx + 7}, $${paramIdx + 8}, $${paramIdx + 9}, $${paramIdx + 10})`);
                    values.push(
                        ev.vulnId,
                        ev.engineId,
                        ev.engineVersion,
                        ev.ruleId,
                        ev.ruleVersion,
                        ev.confidence,
                        ev.confidenceScore,
                        ev.filePath,
                        ev.lineNumber,
                        ev.snippetHash,
                        JSON.stringify(ev.evidencePayload)
                    );
                    paramIdx += 11;
                }

                if (valueClauses.length > 0) {
                    await client.query(`
                        INSERT INTO finding_evidence (
                            vulnerability_id, engine_id, engine_version, rule_id, rule_version,
                            confidence, confidence_score, file_path, line_number, snippet_hash, evidence_payload
                        ) VALUES ${valueClauses.join(', ')}
                    `, values);
                }
            }

            // Update developer metrics if new findings were introduced
            if (newFindingsInsertedCount > 0 && githubIdentityId) {
                await client.query(`
                    INSERT INTO workspace_developer_metrics (github_identity_id, workspace_id, open_findings_introduced)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (github_identity_id) DO UPDATE SET 
                        open_findings_introduced = workspace_developer_metrics.open_findings_introduced + $3,
                        updated_at = NOW()
                `, [githubIdentityId, workspaceId, newFindingsInsertedCount]);
            }

            // 5. Save Shadow Comparison
            if (shadowComparison) {
                await client.query(`
                    INSERT INTO shadow_scan_results (
                        scan_id, authoritative_engine, shadow_engine,
                        authoritative_finding_count, shadow_finding_count,
                        missing_in_shadow, new_in_shadow, comparison_data
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [
                    scanId,
                    shadowComparison.authoritativeEngine,
                    shadowComparison.shadowEngine,
                    shadowComparison.authoritativeFindingCount,
                    shadowComparison.shadowFindingCount,
                    shadowComparison.missingInShadow,
                    shadowComparison.newInShadow,
                    JSON.stringify(shadowComparison.comparisonData)
                ]);
            }

            // 6. Save Scan Files in batches
            const eligibleFiles = prFiles.filter(f => f.status !== 'removed');
            const FILE_BATCH_SIZE = 200;
            for (let i = 0; i < eligibleFiles.length; i += FILE_BATCH_SIZE) {
                const chunk = eligibleFiles.slice(i, i + FILE_BATCH_SIZE);
                const values = [];
                const valueClauses = [];
                let paramIdx = 1;

                for (const file of chunk) {
                    valueClauses.push(`($${paramIdx}, $${paramIdx + 1})`);
                    values.push(scanId, file.filename);
                    paramIdx += 2;
                }

                if (valueClauses.length > 0) {
                    await client.query(`
                        INSERT INTO scan_files (scan_id, file_path)
                        VALUES ${valueClauses.join(', ')}
                        ON CONFLICT (scan_id, file_path) DO NOTHING
                    `, values);
                }
            }

            // 6. Update Scan Record
            // conclusion and status are written INSIDE the transaction so they are set atomically with findings.
            await client.query(`
                UPDATE scans
                SET status = $7,
                    total_files = $2,
                    total_findings = $3,
                    error_message = $4,
                    duration_ms = $5,
                    conclusion = $6,
                    finished_at = NOW()
                WHERE id = $1
            `, [
                scanId, prFiles.length, findings.length, errorMsg, durationMs, finalConclusion, finalStatus
            ]);
            await client.query(
                `INSERT INTO scan_logs (scan_id, level, message) VALUES ($1, $2, $3)`,
                [scanId, scanResultStatus === 'FAILED' || errorMsg ? 'error' : 'info', errorMsg || `Scan ${scanResultStatus.toLowerCase()}.`]
            );

            // 7. Write to Transactional Outbox
            const payload = {
                ...githubData,
                repositoryId,
                workspaceId,
                status: 'completed',
                conclusion: finalConclusion === 'PASS' ? 'success' : (finalConclusion === 'CANCELLED' ? 'cancelled' : 'failure')
            };

            await client.query(`
                INSERT INTO scan_events (scan_id, event_type, payload)
                VALUES ($1, 'scan_completed', $2)
            `, [scanId, JSON.stringify(payload)]);

            await client.query('COMMIT');
        } catch (dbError) {
            await client.query('ROLLBACK');
            throw dbError;
        } finally {
            client.release();
        }

        const persistenceDurationMs = Date.now() - persistenceStartTime;
        stageRecords.push({
            stageName: 'PERSISTENCE',
            status: 'SUCCESS',
            durationMs: persistenceDurationMs,
            findingsProduced: findings.length,
            filesProcessed: prFiles.length
        });

        // Transform evaluations and discrete stages into canonical scan_stage_telemetry records
        const canonicalTelemetry = transformToCanonicalTelemetry(scanId, rawEvaluations, stageRecords);

        // Record all accumulated telemetry out of transaction (failure safe)
        await ScanTelemetry.recordBatch(canonicalTelemetry);

        // Final transition
        await ScanLifecycle.transition(scanId, finalStatus, {
            conclusion: finalConclusion
        });

        const summary = errorMsg 
            ? `Scan failed with error: ${errorMsg}` 
            : `Scan complete. Found ${findings.length} vulnerabilities across ${prFiles.length} files.`;

        try {
            const { default: AnalyticsAggregatorService } = await import('../../analytics/services/analytics-aggregator.service.js');
            const { default: RiskScoreService } = await import('../../security/risk/risk-score.service.js');
            
            await RiskScoreService.updateRepositoryRisk(repositoryId, workspaceId);
            await AnalyticsAggregatorService.updateWorkspaceSnapshot(workspaceId);
        } catch (aggErr) {
            console.error(`[ScanOrchestrator] Failed to trigger risk/analytics aggregation:`, aggErr);
        }

        return {
            status: scanResultStatus,
            summary,
            findingsCount: findings.length,
            durationMs
        };
    }
}
