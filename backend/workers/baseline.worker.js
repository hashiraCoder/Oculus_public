import { Worker } from 'bullmq';
import redis from '../config/redis.js';
import fs from 'fs/promises';
import path from 'path';
import { getInstallationAccessToken } from '../github/services/github-auth.service.js';
import GithubClientService from '../github/services/github-client.service.js';
import { ScanOrchestratorService } from '../scanner/orchestrator/scan-orchestrator.service.js';
import { acquireFromTarball } from '../scanner/source/source-acquisition.js';

export const baselineWorker = new Worker('baseline-scan', async (job) => {
    const { scanId, installationId, repositoryId, workspaceId, owner, repositoryName, defaultBranch } = job.data;
    const tempDir = path.join('/tmp', 'oculus', 'baseline', String(scanId));
    const archivePath = path.join('/tmp', 'oculus', 'baseline', `${scanId}.tar.gz`);

    try {
        const token = await getInstallationAccessToken(installationId);
        const client = new GithubClientService(token);

        // 1. Download tarball
        console.log(`[Baseline Worker] Downloading tarball for ${owner}/${repositoryName}@${defaultBranch}...`);
        const tarballBuffer = await client.downloadTarball(owner, repositoryName, defaultBranch);

        await fs.mkdir(tempDir, { recursive: true });
        await fs.writeFile(archivePath, tarballBuffer);

        // 2. Extract tarball using the shared, security-hardened SourceAcquisition module.
        //    This replaces the previous execAsync('tar -xzf ...') call which had no
        //    zip-slip, symlink, path-traversal, or archive-bomb protections.
        console.log(`[Baseline Worker] Extracting tarball for ${owner}/${repositoryName}...`);
        const { prFiles, totalFiles, totalExtractedBytes } = await acquireFromTarball({
            archivePath,
            tempDir,
            headSha: null, // baseline uses branch name, not a commit SHA
        });

        if (prFiles.length === 0) {
            const error = new Error('Zero files acquired from baseline tarball');
            error.sourceFailureCategory = 'SOURCE_EMPTY';
            throw error;
        }

        console.log(`[Baseline Worker] Acquired ${prFiles.length} files (${totalExtractedBytes} bytes) for baseline scan ${scanId}`);

        // 3. Run orchestrator with isBaseline=true
        await ScanOrchestratorService.executeScan(scanId, repositoryId, prFiles, workspaceId, true);

    } catch (error) {
        console.error(`[Baseline Worker Error] scanId: ${scanId}`, error);

        try {
            const { query } = await import('../config/db.js');
            await query(
                `UPDATE scans SET status = 'FAILED', error_message = $1, finished_at = NOW() WHERE id = $2`,
                [error.message, scanId]
            );
            await query(`
                INSERT INTO scan_events (scan_id, event_type, payload)
                VALUES ($1, 'scan_failed', $2)
            `, [
                scanId,
                JSON.stringify({
                    installationId, owner, repo: repositoryName, headSha: defaultBranch,
                    status: 'failed', conclusion: 'failure',
                    output: {
                        title: 'Oculus Baseline Scan Errored',
                        summary: error.sourceFailureCategory || 'INTERNAL_ERROR',
                        text: error.message
                    }
                })
            ]);
        } catch (dbError) {
            console.error(`[Baseline Worker Error] Failed to write outbox event for scanId: ${scanId}`, dbError);
        }

        throw error;
    } finally {
        try {
            await fs.rm(archivePath, { force: true });
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch (cleanupError) {
            console.error(`[Baseline Worker Cleanup Error] scanId: ${scanId}`, cleanupError);
        }
    }
}, {
    connection: redis,
    concurrency: 2,
    drainDelay: 60000,
    stalledInterval: 120000
});

baselineWorker.on('failed', (job, err) => {
    console.error(`[Baseline Worker] Job ${job.id} failed:`, err);
});

baselineWorker.on('error', (err) => {
    console.error(`[Baseline Worker] Error:`, err.message);
});
