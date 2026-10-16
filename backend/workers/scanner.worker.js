import { Worker } from 'bullmq';
import redis from '../config/redis.js';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getInstallationAccessToken } from '../github/services/github-auth.service.js';
import GithubClientService from '../github/services/github-client.service.js';
import { ScanOrchestratorService } from '../scanner/orchestrator/scan-orchestrator.service.js';
import { acquireFromTarball, acquireFromPullRequest } from '../scanner/source/source-acquisition.js';
import { WorkerLease } from '../scanner/lifecycle/worker-lease.js';
import { ScanLifecycle } from '../scanner/lifecycle/scan-lifecycle.js';
import { ScanTelemetry } from '../scanner/telemetry/telemetry.js';
import { onScanComplete } from '../scanner/scheduler/scan-scheduler.js';

const execAsync = promisify(exec);
const E2E_FIXTURE_REPOSITORY_ID = '00000000-0000-0000-0000-000000000001';
const isE2eFixtureEnabled = process.env.NODE_ENV === 'test'
    && process.env.ENABLE_SCANNER_E2E_FIXTURE === 'true';

const concurrency = parseInt(process.env.SCANNER_MAX_CONCURRENCY || '3', 10);
const workerLease = new WorkerLease('scanner', concurrency);
workerLease.start().catch(err => console.error('[Scanner Worker] Failed to start lease heartbeat:', err));

export const stopScannerWorkerLease = async () => {
    await workerLease.stop().catch(() => {});
};

const classifyFailure = (error, stage) => {
    if (error?.sourceFailureCategory) return error.sourceFailureCategory;
    if (stage !== 'source_acquisition') return 'PERSISTENCE_FAILED';
    if (error?.status === 401) return 'SOURCE_AUTH_FAILED';
    if (error?.status === 403 || error?.isPermanent) return 'SOURCE_PERMISSION_DENIED';
    if (error?.status === 404) return 'SOURCE_NOT_FOUND';
    if (error?.operation?.includes('/tarball/')) return 'SOURCE_DOWNLOAD_FAILED';
    if (error?.message?.includes('Zero files acquired')) return 'SOURCE_EMPTY';
    if (error?.message?.includes('extraction')
        || error?.message?.includes('Archive bomb')
        || error?.message?.includes('tarball')) return 'SOURCE_EXTRACTION_FAILED';
    return 'SOURCE_DOWNLOAD_FAILED';
};

export const scannerWorker = new Worker('scanner', async (job) => {
    const { scanId, installationId, repositoryId, workspaceId, pullNumber, headSha, owner, repositoryName, githubIdentityId } = job.data;
    const tempDir = path.join('/tmp', 'oculus', 'scans', String(scanId));
    const archivePath = path.join('/tmp', 'oculus', 'scans', `${scanId}.tar.gz`);
    const acquisitionContext = {
        scanId,
        repositoryId,
        installationId,
        owner,
        repositoryName,
        ref: headSha,
        acquisitionMode: pullNumber ? 'pull_request_files' : 'repository_tarball',
        pullNumber: pullNumber || null,
        githubOperation: null,
        httpStatus: null,
        fileCount: 0,
    };
    let pipelineStage = 'source_acquisition';

    console.log(`[JOB_RECEIVED] jobId:${job.id} scanId:${scanId} workerPid:${process.pid}`);

    const queueWaitMs = job.timestamp ? Math.max(0, Date.now() - job.timestamp) : 0;
    await ScanTelemetry.record({
        scanId,
        stageName: 'QUEUE_WAIT',
        status: 'SUCCESS',
        durationMs: queueWaitMs,
        metadata: { priority: job.opts?.priority, attemptsMade: job.attemptsMade }
    });

    try {
        if (isE2eFixtureEnabled && repositoryId === E2E_FIXTURE_REPOSITORY_ID) {
            console.log(`[Scanner Worker] E2E LOCAL MODE: Preparing local files for real engine scan`);
            const mockFilename = `mock-file-${Date.now()}.js`;
            const mockFiles = [ { filename: mockFilename, status: 'added' } ];
            
            await fs.mkdir(tempDir, { recursive: true });
            await fs.writeFile(path.join(tempDir, mockFilename), 'const aws_key = "AKIAZZZZZZZZZZZZZZZZ";\n');

            console.log(`[SOURCE_ACQUISITION_STARTED] scanId:${scanId}`);
            console.log(`[SOURCE_ACQUISITION_COMPLETED] scanId:${scanId} fileCount:1 eligibleFileCount:1`);

            const githubData = { installationId, owner, repo: repositoryName, headSha };
            await ScanOrchestratorService.executeScan(scanId, repositoryId, mockFiles, workspaceId, false, githubIdentityId, githubData);
            console.log(`[JOB_COMPLETED] jobId:${job.id} scanId:${scanId}`);
            return;
        }

        await workerLease.addJob(scanId);
        await ScanLifecycle.transition(scanId, 'DISPATCHED');

        if (await ScanLifecycle.isCancelRequested(scanId)) {
            console.log(`[Scanner Worker] Scan ${scanId} was cancelled before source acquisition.`);
            await ScanLifecycle.transition(scanId, 'CANCELLED', { conclusion: 'CANCELLED' });
            return;
        }

        await ScanLifecycle.transition(scanId, 'ACQUIRING_SOURCE');
        const acquisitionStartTime = Date.now();

        console.log(`[REAL_GITHUB_SCAN_STARTED] repositoryId:${repositoryId} installationId:${installationId} repo:${owner}/${repositoryName} prNumber:${pullNumber || 'none'} sha:${headSha}`);
        console.log(`[SOURCE_CONTEXT] ${JSON.stringify(acquisitionContext)}`);
        console.log(`[SOURCE_ACQUISITION_STARTED] scanId:${scanId}`);

        const token = await getInstallationAccessToken(installationId);
        const client = new GithubClientService(token);
        let prFiles = [];
        let totalDiscovered = 0;
        let totalBytesAcquired = 0;
        
        await fs.mkdir(tempDir, { recursive: true });

        if (pullNumber) {
            acquisitionContext.githubOperation = `GET /repos/${owner}/${repositoryName}/pulls/${pullNumber}/files`;
            console.log(`[GITHUB_SOURCE_REQUESTED] operation:getPullRequestFiles`);
            const rawPrFiles = await client.getPullRequestFiles(owner, repositoryName, pullNumber);
            acquisitionContext.httpStatus = 200;
            acquisitionContext.fileCount = rawPrFiles.length;
            console.log(`[GITHUB_SOURCE_RECEIVED] status:200 fileCount:${rawPrFiles.length}`);

            const result = await acquireFromPullRequest({
                client,
                owner,
                repositoryName,
                prFiles: rawPrFiles,
                tempDir
            });
            prFiles = result.prFiles;
            totalDiscovered = rawPrFiles.length; // Raw array length
            totalBytesAcquired = result.totalBytesAcquired;
            
            console.log(`[SOURCE_VALIDATION] eligibleFiles:${prFiles.length} totalBytes:${totalBytesAcquired}`);
        } else {
            acquisitionContext.githubOperation = `GET /repos/${owner}/${repositoryName}/tarball/${headSha}`;
            console.log(`[GITHUB_SOURCE_REQUESTED] operation:tarball sha:${headSha}`);
            const tarballBuffer = await client.downloadTarball(owner, repositoryName, headSha);
            acquisitionContext.httpStatus = 200;
            console.log(`[GITHUB_SOURCE_RECEIVED] status:200 totalBytes:${tarballBuffer.length}`);
            await fs.writeFile(archivePath, tarballBuffer);
            
            const result = await acquireFromTarball({
                archivePath,
                tempDir,
                headSha
            });
            prFiles = result.prFiles;
            totalDiscovered = result.totalFiles;
            totalBytesAcquired = result.totalExtractedBytes;
            acquisitionContext.fileCount = totalDiscovered;
            console.log(`[SOURCE_VALIDATION] totalFilesExtracted:${totalDiscovered} totalBytesExtracted:${totalBytesAcquired}`);
        }

        if (prFiles.length === 0) {
            const error = new Error('Zero files acquired for scan');
            error.sourceFailureCategory = 'SOURCE_EMPTY';
            throw error;
        }

        console.log(`[SOURCE_ACQUISITION_COMPLETED] scanId:${scanId} fileCount:${totalDiscovered} eligibleFileCount:${prFiles.length}`);

        await ScanTelemetry.record({
            scanId,
            stageName: 'SOURCE_ACQUISITION',
            status: 'SUCCESS',
            durationMs: Date.now() - acquisitionStartTime,
            filesProcessed: totalDiscovered,
            metadata: { eligibleFiles: prFiles.length, bytes: totalBytesAcquired }
        });

        if (await ScanLifecycle.isCancelRequested(scanId)) {
            console.log(`[Scanner Worker] Scan ${scanId} was cancelled after source acquisition.`);
            await ScanLifecycle.transition(scanId, 'CANCELLED', { conclusion: 'CANCELLED' });
            return;
        }

        pipelineStage = 'engine_execution';
        const githubData = { installationId, owner, repo: repositoryName, headSha };
        const result = await ScanOrchestratorService.executeScan(scanId, repositoryId, prFiles, workspaceId, false, githubIdentityId, githubData);

        console.log(`[JOB_COMPLETED] jobId:${job.id} scanId:${scanId}`);

    } catch (error) {
        const attempt = job.attemptsMade + 1;
        const maxAttempts = job.opts.attempts || 5;
        const failureCategory = classifyFailure(error, pipelineStage);
        const failureMessage = `[${failureCategory}] ${error.message}`;

        console.error(`[SCAN_FAILED] jobId:${job.id} scanId:${scanId} attempt:${attempt}/${maxAttempts} stage:${pipelineStage} category:${failureCategory} error:${error.message}`);

        const isPersistenceFailure = failureCategory === 'PERSISTENCE_FAILED';
        const isEnumSchemaFailure = Boolean(
            error?.message?.includes('invalid input value for enum')
            || error?.message?.includes('enum scan_status_enum')
            || error?.code === '22P02'
        );
        const isPermanentFailure = isPersistenceFailure
            || isEnumSchemaFailure
            || error?.isPermanent
            || [401, 403, 404].includes(error?.status)
            || ['SOURCE_AUTH_FAILED', 'SOURCE_PERMISSION_DENIED', 'SOURCE_NOT_FOUND', 'SOURCE_EMPTY', 'SOURCE_EXTRACTION_FAILED'].includes(failureCategory);
        const shouldFailFast = isPermanentFailure || attempt >= maxAttempts;

        try {
            const { query } = await import('../config/db.js');
            const failureContext = {
                ...acquisitionContext,
                failureCategory,
                attempt,
                maxAttempts,
                githubOperation: error.operation || acquisitionContext.githubOperation,
                httpStatus: error.status || acquisitionContext.httpStatus,
            };

            if (shouldFailFast) {
                console.error(`[SCAN_FAILURE_TERMINAL] scanId:${scanId} — marking scan as ERROR and completing job (fail-fast). ${error.message}`);

                await query(
                    `UPDATE scans SET status = 'FAILED', conclusion = 'ERROR', error_message = $1, finished_at = NOW() WHERE id = $2`,
                    [failureMessage, scanId]
                );

                await query(`
                    INSERT INTO scan_events (scan_id, event_type, payload)
                    VALUES ($1, 'scan_failed', $2)
                `, [
                    scanId,
                    JSON.stringify({
                        ...failureContext,
                        installationId, owner, repo: repositoryName, headSha, repositoryId, workspaceId,
                        status: 'failed', conclusion: 'failure',
                        output: {
                            title: 'Oculus Scan Errored',
                            summary: failureCategory,
                            text: failureMessage
                        }
                    })
                ]);

                // Return cleanly — do NOT re-throw so BullMQ does not loop on permanent errors
                return;
            } else {
                // Retry transparency — update the check run to show it's retrying.
                await query(`
                    INSERT INTO scan_events (scan_id, event_type, payload)
                    VALUES ($1, 'scan_started', $2)
                `, [
                    scanId,
                    JSON.stringify({
                        installationId, owner, repo: repositoryName, headSha, repositoryId, workspaceId,
                        status: 'in_progress',
                        output: {
                            title: 'Scan in progress',
                            summary: `Attempt ${attempt}/${maxAttempts}`,
                            text: `Scan encountered a transient error: ${failureMessage}. Retrying...`
                        }
                    })
                ]);
            }
        } catch (dbError) {
            console.error(`[Scanner Worker Error] Failed to write outbox event for scanId: ${scanId}`, dbError);
        }

        // Only re-throw for transient retryable errors
        throw error;

    } finally {
        // Decrement per-workspace in-flight counter
        await onScanComplete(workspaceId).catch(err => console.error('[Scanner Worker] onScanComplete failed:', err));

        await workerLease.removeJob(scanId).catch(err => console.error(err));
        
        // Delete temporary files after completion
        try {
            await fs.rm(archivePath, { force: true });
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch (cleanupError) {
            console.error(`[Scanner Worker Cleanup Error] scanId: ${scanId}`, cleanupError);
        }
    }
}, {
    connection: redis,
    // SCANNER_MAX_CONCURRENCY controls how many scans run simultaneously across this
    // worker process. Default: 3. For 10k-event burst handling, this is the primary
    // backpressure knob — all other jobs queue in BullMQ until a slot is free.
    // Set higher only when the host has sufficient CPU and memory headroom.
    concurrency: parseInt(process.env.SCANNER_MAX_CONCURRENCY || '3', 10),
    drainDelay: 60000,
    stalledInterval: 120000
});

scannerWorker.on('failed', (job, err) => {
    console.error(`[Scanner Worker] Job ${job.id} failed:`, err);
});

scannerWorker.on('error', (err) => {
    console.error(`[Scanner Worker] Error:`, err.message);
});
