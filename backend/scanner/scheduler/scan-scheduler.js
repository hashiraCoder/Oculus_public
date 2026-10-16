/**
 * scanner/scheduler/scan-scheduler.js
 *
 * Central scan dispatch layer. All scan enqueue calls MUST go through here
 * rather than calling scannerQueue.add() directly. This enforces:
 *
 *   1. Priority-based scheduling (P0 → P3)
 *   2. Per-workspace fairness (workspace quota enforcement via Redis)
 *   3. Deduplication (idempotent job IDs)
 *   4. Structured dispatch logging for observability
 *
 * Priority tiers:
 *   P0 (10) — Security-critical: push to main/default branch, webhook-triggered PRs
 *   P1 (7)  — High: developer-triggered manual PR rescan
 *   P2 (5)  — Normal: manual API-triggered full scan
 *   P3 (1)  — Background: scheduled/cron baseline scans, low-priority batch
 *
 * BullMQ uses HIGHER numeric priority = processed FIRST.
 * Note: BullMQ priorities range 1–MAX_INT; we use 1, 5, 7, 10 for coarse tiers.
 */

import { scannerQueue } from '../../queues/scanner.queue.js';
import redis from '../../config/redis.js';

/**
 * Priority tier constants.
 * Higher number = higher priority in BullMQ.
 */
export const SCAN_PRIORITY = {
    P0_CRITICAL: 10,  // Webhook PR events to default branch
    P1_HIGH: 7,       // Developer-triggered rescans
    P2_NORMAL: 5,     // Manual API scans
    P3_BACKGROUND: 1  // Scheduled / baseline scans
};

/**
 * Per-workspace concurrent scan quota.
 * A workspace with many repos won't monopolize scanner workers.
 * Default: 5 scans in-flight per workspace before queueing.
 */
const WORKSPACE_QUOTA = parseInt(process.env.SCANNER_WORKSPACE_QUOTA || '5', 10);

/**
 * Dispatch a scan job to BullMQ with the given priority tier.
 *
 * @param {object} opts
 * @param {string}  opts.scanId
 * @param {string}  opts.repositoryId
 * @param {string}  opts.workspaceId
 * @param {string}  opts.installationId
 * @param {string}  opts.owner
 * @param {string}  opts.repositoryName
 * @param {string}  opts.headSha
 * @param {string|null} [opts.pullNumber]
 * @param {string|null} [opts.baseSha]
 * @param {string|null} [opts.githubIdentityId]
 * @param {string|null} [opts.branch]
 * @param {number}  [opts.priority]       - Override priority tier (use SCAN_PRIORITY constants)
 * @param {string|null} [opts.jobId]      - Explicit dedup job ID; auto-generated if null
 * @returns {Promise<import('bullmq').Job>}
 */
export async function dispatchScan(opts) {
    const {
        scanId,
        repositoryId,
        workspaceId,
        installationId,
        owner,
        repositoryName,
        headSha,
        pullNumber = null,
        baseSha = null,
        githubIdentityId = null,
        branch = null,
        priority = SCAN_PRIORITY.P2_NORMAL,
        jobId = null,
    } = opts;

    // ── Workspace quota enforcement ─────────────────────────────────────────
    // Track in-flight scans per workspace using a Redis sorted set.
    // This is soft enforcement (advisory) — it will not throw if quota is exceeded
    // but it will log a warning so QueueMonitor can surface it.
    try {
        const quotaKey = `scheduler:workspace_inflight:${workspaceId}`;
        const inflight = await redis.incr(quotaKey);
        await redis.expire(quotaKey, 3600); // TTL 1hr to prevent leak on crash

        if (inflight > WORKSPACE_QUOTA) {
            console.warn(`[ScanScheduler] workspace:${workspaceId} exceeded quota (${inflight}/${WORKSPACE_QUOTA}). Job queued at lower priority.`);
            // Demote priority by one tier to ensure fairness
            opts.priority = Math.max(1, priority - 2);
        }
    } catch (redisErr) {
        console.error('[ScanScheduler] Redis quota check failed (non-fatal):', redisErr.message);
    }

    const resolvedPriority = opts.priority ?? priority;

    const jobPayload = {
        scanId,
        installationId,
        workspaceId,
        repositoryId,
        pullNumber,
        headSha,
        baseSha,
        owner,
        repositoryName,
        githubIdentityId,
        branch
    };

    const resolvedJobId = jobId ?? `scan-${repositoryId}-${headSha ? headSha.slice(0, 8) : 'head'}-${pullNumber ?? 'full'}-${scanId}`;

    const jobOptions = {
        jobId: resolvedJobId,
        priority: resolvedPriority,
        // Dedup: if a job with the same ID already exists (and is waiting), don't add again
        // BullMQ handles this natively when jobId is set.
    };

    console.log(`[ScanScheduler] Dispatching scanId:${scanId} repo:${owner}/${repositoryName} priority:${resolvedPriority} jobId:${resolvedJobId}`);

    const job = await scannerQueue.add('scan', jobPayload, jobOptions);
    return job;
}

/**
 * Decrement workspace in-flight counter when a scan job completes (called by worker).
 * @param {string} workspaceId
 */
export async function onScanComplete(workspaceId) {
    if (!workspaceId) return;
    try {
        const quotaKey = `scheduler:workspace_inflight:${workspaceId}`;
        const val = await redis.decr(quotaKey);
        if (val < 0) await redis.set(quotaKey, 0);
    } catch (err) {
        console.error('[ScanScheduler] Redis quota decrement failed (non-fatal):', err.message);
    }
}
