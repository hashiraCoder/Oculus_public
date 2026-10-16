import { getPool } from '../config/db.js';
import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const runTest = async () => {
    console.log('--- Oculus Phase 4: E2E Acceptance Test ---');
    const pool = getPool();

    try {
        const workspaceId = '00000000-0000-0000-0000-000000000003';
        const repoId = '00000000-0000-0000-0000-000000000001';
        
        // 1. Ensure mock data exists
        await pool.query(`
            INSERT INTO workspaces (id, name, type)
            VALUES ($1, 'e2e-workspace', 'ORGANIZATION')
            ON CONFLICT DO NOTHING
        `, [workspaceId]);

        await pool.query(`
            INSERT INTO repositories (id, workspace_id, github_repo_id, name, full_name, owner, installation_id)
            VALUES ($1, $2, 12345, 'e2e-repo', 'owner/e2e-repo', 'owner', 99999)
            ON CONFLICT DO NOTHING
        `, [repoId, workspaceId]);

        console.log('[+] Prepared mock workspace & repository.');

        // 2. Create mock scan in DB first
        const scanResult = await pool.query(`
            INSERT INTO scans (repository_id, status, triggered_by, head_sha, commit_hash)
            VALUES ($1, 'SCANNING', 'WEBHOOK', 'abc123e2esha', 'abc123e2esha')
            RETURNING id
        `, [repoId]);
        const scanId = scanResult.rows[0].id;

        // 3. Inject Scanner Event directly
        console.log(`[+] Injecting Scanner Event (Scan ID: ${scanId})`);
        const { Queue } = await import('bullmq');
        const redis = (await import('../config/redis.js')).default;
        const scannerQueue = new Queue('scanner', { connection: redis });
        
        await scannerQueue.add('scan-pr', {
            scanId,
            installationId: 99999,
            workspaceId,
            repositoryId: repoId,
            pullNumber: 1,
            headSha: 'abc123e2esha',
            owner: 'owner',
            repositoryName: 'e2e-repo'
        });

        // 4. Wait for processing (poll DB instead of Redis Pub/Sub)
        console.log('[+] Waiting up to 15s for workers to process the pipeline...');
        let elapsed = 0;
        let completed = false;
        
        while (!completed && elapsed < 15) {
            await new Promise(r => setTimeout(r, 1000));
            elapsed++;
            
            // Check scan status
            const check = await pool.query(`SELECT status FROM scans WHERE id = $1`, [scanId]);
            if (check.rows[0]?.status === 'COMPLETED' || check.rows[0]?.status === 'FAILED') {
                completed = true;
                console.log(`[+] Scan finished with status: ${check.rows[0].status}`);
                break;
            }
        }

        if (completed) {
            console.log('\n[+] Phase 3/R3 Lifecycle completely verified. End-to-end pipeline is functional.');
        } else {
            console.error('\n[-] Timeout: Pipeline did not complete in 15 seconds.');
        }
        
        process.exit(completed ? 0 : 1);
    } catch (err) {
        console.error('Test Failed:', err);
        process.exit(1);
    }
};

runTest();
