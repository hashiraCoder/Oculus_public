import { getPool, query } from '../config/db.js';
import redis from '../config/redis.js';
import { processOutbox, startOutboxWorker, stopOutboxWorker } from '../workers/outbox.worker.js';
import GithubStatusService from '../github/services/github-status.service.js';
import { NotificationEvents } from '../notifications/notification.events.js';
import logger from '../config/logger.js';

const runVerification = async () => {
    logger.info('════════════════════════════════════════════════════════');
    logger.info('     Oculus Outbox Subsystem Hardening Verification     ');
    logger.info('════════════════════════════════════════════════════════\n');

    const testScanId = '00000000-0000-0000-0000-000000000099';
    const testRepoId = '00000000-0000-0000-0000-000000000001';
    const testWorkspaceId = '00000000-0000-0000-0000-000000000003';

    try {
        // Explicitly connect Redis if not ready
        if (redis.status === 'wait') {
            await redis.connect().catch(() => {});
        }

        // ── 0. Setup Mock Data ────────────────────────────────────────────────
        logger.info('[Setup] Ensuring fixture workspace and repository exist...');
        await query(`
            INSERT INTO workspaces (id, name, type, created_at)
            VALUES ($1, 'Outbox Test Workspace', 'PERSONAL', NOW())
            ON CONFLICT DO NOTHING
        `, [testWorkspaceId]);

        await query(`
            INSERT INTO repositories (id, workspace_id, github_repo_id, name, full_name, owner, installation_id, created_at)
            VALUES ($1, $2, 99999999, 'outbox-test-repo', 'oculus/outbox-test-repo', 'oculus', 12345678, NOW())
            ON CONFLICT DO NOTHING
        `, [testRepoId, testWorkspaceId]);

        await query(`
            INSERT INTO scans (id, repository_id, commit_hash, status, triggered_by, created_at)
            VALUES ($1, $2, 'abcdef1234567890abcdef1234567890abcdef12', 'COMPLETED', 'MANUAL', NOW())
            ON CONFLICT DO NOTHING
        `, [testScanId, testRepoId]);

        // Clean up previous test artifacts for this scan
        await query(`DELETE FROM scan_events WHERE scan_id = $1`, [testScanId]);
        await query(`DELETE FROM github_check_runs WHERE scan_id = $1`, [testScanId]);
        await query(`DELETE FROM notifications WHERE workspace_id = $1`, [testWorkspaceId]);

        // ── 1. Schema & Index Verification ────────────────────────────────────
        logger.info('\n[Test 1] Database Indexes & Constraints Verification');
        const checkRunIndexRes = await query(`
            SELECT indexname FROM pg_indexes
            WHERE tablename = 'github_check_runs' AND indexname = 'uq_github_check_runs_scan_id'
        `);
        if (checkRunIndexRes.rows.length === 0) {
            throw new Error('FAIL: uq_github_check_runs_scan_id unique index not found!');
        }
        logger.info('  ✓ Unique index uq_github_check_runs_scan_id is active');

        const outboxIndexRes = await query(`
            SELECT indexname FROM pg_indexes
            WHERE tablename = 'scan_events' AND indexname = 'idx_scan_events_outbox_claim'
        `);
        if (outboxIndexRes.rows.length === 0) {
            throw new Error('FAIL: idx_scan_events_outbox_claim index not found!');
        }
        logger.info('  ✓ Partial claim index idx_scan_events_outbox_claim is active');

        // ── 2. Stale PROCESSING Lease Recovery ───────────────────────────────
        logger.info('\n[Test 2] Stale PROCESSING Lease Recovery Verification');
        const staleEventRes = await query(`
            INSERT INTO scan_events (scan_id, event_type, payload, status, locked_at, created_at)
            VALUES (
                $1,
                'scan_completed',
                $2,
                'PROCESSING',
                NOW() - INTERVAL '3 minutes',
                NOW() - INTERVAL '5 minutes'
            )
            RETURNING id
        `, [testScanId, JSON.stringify({
            workspaceId: testWorkspaceId,
            repositoryId: testRepoId,
            owner: 'oculus',
            repo: 'outbox-test-repo',
            headSha: 'abcdef1234567890',
            status: 'completed',
            conclusion: 'success'
        })]);

        const staleEventId = staleEventRes.rows[0].id;
        logger.info(`  Inserted stale event (ID: ${staleEventId}, status: PROCESSING, locked_at: NOW() - 3 min)`);

        // Process batches until our stale event is processed
        let attempts = 0;
        let isRecovered = false;
        while (attempts < 10 && !isRecovered) {
            attempts++;
            const processedCount = await processOutbox();
            const verifiedStaleEvent = await query(`SELECT status, processed_at FROM scan_events WHERE id = $1`, [staleEventId]);
            if (verifiedStaleEvent.rows[0]?.status === 'COMPLETED' && verifiedStaleEvent.rows[0]?.processed_at) {
                isRecovered = true;
                break;
            }
            if (processedCount === 0) break;
        }

        if (!isRecovered) {
            const finalCheck = await query(`SELECT status FROM scan_events WHERE id = $1`, [staleEventId]);
            throw new Error(`FAIL: Stale PROCESSING event was not recovered! Status is ${finalCheck.rows[0]?.status}`);
        }
        logger.info('  ✓ Stale PROCESSING lease was successfully reclaimed and completed!');

        // ── 3. Exponential Backoff Honoring ──────────────────────────────────
        logger.info('\n[Test 3] Exponential Backoff Honoring Verification');
        const futureRetryRes = await query(`
            INSERT INTO scan_events (scan_id, event_type, payload, status, next_retry_at, retry_count)
            VALUES (
                $1,
                'scan_completed',
                '{}',
                'FAILED',
                NOW() + INTERVAL '1 hour',
                1
            )
            RETURNING id
        `, [testScanId]);

        const futureEventId = futureRetryRes.rows[0].id;
        logger.info(`  Inserted backoff event (ID: ${futureEventId}, status: FAILED, next_retry_at: NOW() + 1 hour)`);

        await processOutbox();
        const verifiedFutureEvent = await query(`SELECT status FROM scan_events WHERE id = $1`, [futureEventId]);
        if (verifiedFutureEvent.rows[0]?.status !== 'FAILED') {
            throw new Error(`FAIL: Backoff event was prematurely processed! Status is ${verifiedFutureEvent.rows[0]?.status}`);
        }
        logger.info('  ✓ Backoff event was correctly skipped (waiting for next_retry_at)');
        await query(`DELETE FROM scan_events WHERE id = $1`, [futureEventId]);

        // ── 4. Check Run Deduplication ───────────────────────────────────────
        logger.info('\n[Test 4] GitHub Check Run Deduplication Verification');
        // Pre-insert a simulated check run into github_check_runs
        await query(`
            INSERT INTO github_check_runs (scan_id, github_check_id, repository_id, head_sha, status, started_at)
            VALUES ($1, 987654321, $2, 'abcdef1234567890', 'in_progress', NOW())
            ON CONFLICT (scan_id) DO NOTHING
        `, [testScanId, testRepoId]);

        // Simulate a retry of scan_started
        await GithubStatusService.handleStatusUpdate({
            scanId: testScanId,
            eventType: 'scan_started',
            payload: {
                installationId: 12345678,
                owner: 'oculus',
                repo: 'outbox-test-repo',
                headSha: 'abcdef1234567890',
                repositoryId: testRepoId,
                workspaceId: testWorkspaceId
            }
        });

        const checkRunCountRes = await query(`SELECT COUNT(*) as count FROM github_check_runs WHERE scan_id = $1`, [testScanId]);
        if (parseInt(checkRunCountRes.rows[0].count, 10) !== 1) {
            throw new Error(`FAIL: Expected exactly 1 check run row, found ${checkRunCountRes.rows[0].count}`);
        }
        logger.info('  ✓ Check Run deduplication passed (no duplicate check runs created)');

        // ── 5. Notification Deduplication ────────────────────────────────────
        logger.info('\n[Test 5] Notification Deduplication Verification');
        // Reset notifications for workspace
        await query(`DELETE FROM notifications WHERE workspace_id = $1`, [testWorkspaceId]);

        const { default: NotificationService } = await import('../notifications/notification.service.js');
        // Publish scan_started twice
        await NotificationService.publishScanStarted(testWorkspaceId, testRepoId, 'outbox-test-repo', testScanId);
        await NotificationService.publishScanStarted(testWorkspaceId, testRepoId, 'outbox-test-repo', testScanId);

        const notifCountRes = await query(`
            SELECT COUNT(*) as count FROM notifications
            WHERE workspace_id = $1 AND payload->>'scanId' = $2 AND event_type = $3
        `, [testWorkspaceId, testScanId, NotificationEvents.SCAN_STARTED]);

        if (parseInt(notifCountRes.rows[0].count, 10) !== 1) {
            throw new Error(`FAIL: Expected exactly 1 notification, found ${notifCountRes.rows[0].count}`);
        }
        logger.info('  ✓ Notification deduplication passed (duplicate in-app alert suppressed)');

        // ── 6. Cooperative Worker Lifecycle ──────────────────────────────────
        logger.info('\n[Test 6] Cooperative Outbox Start/Stop Lifecycle Verification');
        const workerPromise = startOutboxWorker();
        // Give it 100ms to start loop
        await new Promise(r => setTimeout(r, 100));
        await stopOutboxWorker();
        await workerPromise;
        logger.info('  ✓ Cooperative start/stop cycle cleanly terminated without errors');

        // Clean up
        await query(`DELETE FROM scan_events WHERE scan_id = $1`, [testScanId]);
        await query(`DELETE FROM github_check_runs WHERE scan_id = $1`, [testScanId]);
        await query(`DELETE FROM notifications WHERE workspace_id = $1`, [testWorkspaceId]);

        logger.info('\n════════════════════════════════════════════════════════');
        logger.info('     ✓ ALL OUTBOX HARDENING TESTS PASSED PROVABLY       ');
        logger.info('════════════════════════════════════════════════════════\n');
        process.exit(0);

    } catch (err) {
        logger.error('\n✗ Verification Failed:', err);
        process.exit(1);
    }
};

runVerification();
