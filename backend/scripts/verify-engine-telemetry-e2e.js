import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });

import { getPool } from '../config/db.js';
import { ScanOrchestratorService } from '../scanner/orchestrator/scan-orchestrator.service.js';
import { getScanTelemetry } from '../admin/controllers/scans-admin.controller.js';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

async function runE2EVerification() {
    console.log('=== OCULUS ENGINE TELEMETRY E2E VERIFICATION ===\n');
    const pool = getPool();

    const workspaceId = '00000000-0000-0000-0000-000000000003';
    const repoId = '00000000-0000-0000-0000-000000000001';
    const scanId = crypto.randomUUID();

    try {
        // 1. Create scan record in DB
        await pool.query(`
            INSERT INTO scans (id, repository_id, status, triggered_by, head_sha, commit_hash)
            VALUES ($1, $2, 'ANALYZING', 'MANUAL', 'e2e1234567890abcdef', 'e2e1234567890abcdef')
        `, [scanId, repoId]);

        console.log(`[+] Created test scan: ${scanId}`);

        // 2. Prepare test directory with multi-engine target files
        const scanDir = path.join('/tmp', 'oculus', 'scans', scanId);
        await fs.mkdir(scanDir, { recursive: true });

        // JS file with Secret, Entropy, SAST, and Taint targets
        const jsCode = `
// SecretAnalyzer target
const awsKey = "AKIAIOSFODNN7EXAMPLE";

// EntropyAnalyzer target
const highEntropySecret = "bV^9$#kLp2@!xZ8&qW5*rY3%";

// TaintAnalyzer + SAST target
function handleRequest(req, res) {
    const input = req.query.userInput;
    const query = "SELECT * FROM users WHERE name = '" + input + "'";
    eval(input); // SAST target
}
`;
        await fs.writeFile(path.join(scanDir, 'app.js'), jsCode);

        // SCA target (manifest)
        const pkgCode = JSON.stringify({
            name: 'telemetry-e2e-app',
            version: '1.0.0',
            dependencies: {
                'lodash': '4.17.20' // known vulnerable
            }
        }, null, 2);
        await fs.writeFile(path.join(scanDir, 'package.json'), pkgCode);

        const prFiles = [
            { filename: 'app.js', status: 'added' },
            { filename: 'package.json', status: 'added' }
        ];

        console.log(`[+] Prepared 2 test files covering all 5 engines (Secret, Entropy, SAST, Taint, SCA).`);

        // 3. Execute Scan through Orchestrator
        console.log(`[+] Executing scan through ScanOrchestratorService...`);
        const scanResult = await ScanOrchestratorService.executeScan(
            scanId,
            repoId,
            prFiles,
            workspaceId,
            false,
            null,
            {}
        );

        console.log(`[+] Scan finished with status: ${scanResult.status}, findings: ${scanResult.findingsCount}`);

        // 4. Query scans table for final status and conclusion
        const scanRowRes = await pool.query(`
            SELECT id, status, conclusion, total_files, total_findings, duration_ms, error_message
            FROM scans
            WHERE id = $1
        `, [scanId]);
        const scanRecord = scanRowRes.rows[0];

        console.log('\n--- SCANS TABLE RECORD ---');
        console.log(`Scan ID:       ${scanRecord.id}`);
        console.log(`Status:        ${scanRecord.status}`);
        console.log(`Conclusion:    ${scanRecord.conclusion}`);
        console.log(`Total Files:   ${scanRecord.total_files}`);
        console.log(`Total Findings:${scanRecord.total_findings}`);
        console.log(`Duration:      ${scanRecord.duration_ms}ms`);
        console.log(`Error Message: ${scanRecord.error_message || 'None'}`);

        // 5. Query scan_stage_telemetry table
        const telemetryRes = await pool.query(`
            SELECT id, stage_name, engine_id, engine_version, status, duration_ms, files_processed, findings_produced, metadata, created_at
            FROM scan_stage_telemetry
            WHERE scan_id = $1
            ORDER BY created_at ASC
        `, [scanId]);

        console.log(`\n--- SCAN STAGE TELEMETRY ROWS (${telemetryRes.rows.length} records) ---`);
        console.table(telemetryRes.rows.map(r => ({
            stage_name: r.stage_name,
            engine_id: r.engine_id || '-',
            engine_version: r.engine_version || '-',
            status: r.status,
            duration_ms: Number(r.duration_ms),
            files_processed: r.files_processed,
            findings_produced: r.findings_produced
        })));

        console.log('\n--- ENGINE TELEMETRY METADATA DETAILS ---');
        for (const row of telemetryRes.rows) {
            if (row.stage_name === 'ENGINE_EXECUTION') {
                console.log(`\nEngine: [${row.engine_id}] (Version: ${row.engine_version})`);
                console.log(`  Status:            ${row.status}`);
                console.log(`  Duration:          ${row.duration_ms}ms`);
                console.log(`  Files Processed:   ${row.files_processed}`);
                console.log(`  Findings Produced: ${row.findings_produced}`);
                console.log(`  Metadata:`, JSON.stringify(row.metadata, null, 2));
            }
        }

        // 6. Verify all 5 engines exist in telemetry
        const engineIds = telemetryRes.rows
            .filter(r => r.stage_name === 'ENGINE_EXECUTION')
            .map(r => r.engine_id);

        console.log(`\n--- ENGINES VERIFIED ---`);
        const expectedEngines = ['secret', 'entropy', 'sast', 'taint', 'sca'];
        for (const eng of expectedEngines) {
            const found = engineIds.includes(eng);
            console.log(`  ${eng.padEnd(10)}: ${found ? '✓ PERSISTED' : '✗ MISSING'}`);
            if (!found) {
                throw new Error(`Engine ${eng} was not persisted in scan_stage_telemetry!`);
            }
        }

        // 7. Test Admin Telemetry API endpoint
        const apiData = await new Promise((resolve, reject) => {
            const mockReq = { params: { scanId } };
            const mockRes = {
                status: () => mockRes,
                json: (payload) => resolve(payload)
            };
            getScanTelemetry(mockReq, mockRes, (err) => reject(err));
        });

        console.log(`\n--- ADMIN TELEMETRY API VERIFICATION ---`);
        console.log(`API returned ${apiData?.data?.length} telemetry stages with success=${apiData?.success}.`);
        if (apiData?.data?.length === telemetryRes.rows.length) {
            console.log(`✓ Admin API matches database records perfectly.`);
        } else {
            throw new Error(`Admin API count mismatch: DB=${telemetryRes.rows.length}, API=${apiData?.data?.length}`);
        }

        // Cleanup
        await fs.rm(scanDir, { recursive: true, force: true });
        console.log('\n✓ E2E Verification Completed Successfully with zero errors!');
        process.exit(0);

    } catch (err) {
        console.error('\n[-] E2E Verification Failed:', err);
        process.exit(1);
    }
}

runE2EVerification();
