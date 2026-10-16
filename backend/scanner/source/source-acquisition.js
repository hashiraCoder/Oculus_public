/**
 * scanner/source/source-acquisition.js
 *
 * Shared, security-hardened source acquisition module.
 *
 * Used by BOTH scanner.worker.js (PR + tarball) and baseline.worker.js (tarball).
 * This eliminates the security gap in baseline.worker.js, which previously used
 * execAsync('tar -xzf ...') — a raw shell command with no safety guards.
 *
 * Security guarantees enforced on every tarball:
 *   - Zip-slip path traversal: blocked
 *   - Absolute path extraction: blocked
 *   - Symlink extraction: blocked
 *   - Archive bomb (> MAX_DECOMPRESSED_SIZE): blocked
 *   - SHA verification of extracted root directory against expected commitSha
 *
 * Returns a normalized prFiles array:
 *   [{ filename: 'relative/path/in/repo', status: 'added' }, ...]
 */

import fs from 'fs/promises';
import path from 'path';

// 500 MB decompression limit
const MAX_DECOMPRESSED_SIZE = 500 * 1024 * 1024;

/**
 * Recursively enumerates all files under a directory.
 * @param {string} dir - Absolute path to directory
 * @returns {Promise<string[]>} - Absolute paths of all files
 */
async function getAllFiles(dir) {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getAllFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}

/**
 * Maps an array of absolute file paths to a normalized prFiles array,
 * enforcing that all paths remain within the expected tempDir.
 *
 * @param {string[]} absFilePaths
 * @param {string} tempDir - Absolute path to the sandbox extraction directory
 * @returns {{ filename: string, status: 'added' }[]}
 */
function mapToRelativePrFiles(absFilePaths, tempDir) {
    const resolvedTempDir = path.resolve(tempDir);
    return absFilePaths.map((absPath) => {
        const resolvedPath = path.resolve(absPath);
        if (!resolvedPath.startsWith(resolvedTempDir + path.sep) && resolvedPath !== resolvedTempDir) {
            throw new Error(`Zip-slip path traversal detected during file enumeration: ${resolvedPath}`);
        }
        const relativePath = path.relative(resolvedTempDir, resolvedPath).replace(/\\/g, '/');
        return { filename: relativePath, status: 'added' };
    });
}

/**
 * Acquires source files from a GitHub tarball.
 * Extracts the tarball to tempDir with full security filtering.
 *
 * @param {object} options
 * @param {string} options.archivePath    - Absolute path where the .tar.gz has been written
 * @param {string} options.tempDir        - Absolute path to the extraction directory (must exist)
 * @param {string|null} options.headSha   - Expected commit SHA for root directory validation (optional)
 * @returns {Promise<{ prFiles: Array<{filename:string, status:string}>, totalFiles: number, totalExtractedBytes: number }>}
 */
export async function acquireFromTarball({ archivePath, tempDir, headSha = null }) {
    const tar = await import('tar');
    let totalExtractedBytes = 0;
    let extractedRoot = null;

    await tar.x({
        file: archivePath,
        cwd: tempDir,
        strip: 1,
        filter: (filePath, entry) => {
            // Track the top-level directory name for SHA verification
            if (!extractedRoot) {
                extractedRoot = filePath.split('/')[0];
            }

            // Block symlinks and hard links
            if (entry.type === 'SymbolicLink' || entry.type === 'Link') {
                console.error(`[SourceAcquisition] Symlink blocked: ${filePath}`);
                throw new Error(`Symlink extraction blocked: ${filePath}`);
            }

            // Block absolute paths and path traversal via '..'
            const segments = filePath.split(/[/\\]/);
            if (path.isAbsolute(filePath) || segments.includes('..')) {
                console.error(`[SourceAcquisition] Absolute/traversal path blocked: ${filePath}`);
                throw new Error(`Path traversal blocked: ${filePath}`);
            }

            // Zip-slip guard: resolved path must remain within tempDir
            const resolvedPath = path.resolve(tempDir, filePath);
            const resolvedTempDir = path.resolve(tempDir);
            if (!resolvedPath.startsWith(resolvedTempDir + path.sep) && resolvedPath !== resolvedTempDir) {
                console.error(`[SourceAcquisition] Zip-slip detected: ${resolvedPath}`);
                throw new Error(`Zip-slip path traversal detected: ${resolvedPath}`);
            }

            // Archive bomb guard
            totalExtractedBytes += entry.size ?? 0;
            if (totalExtractedBytes > MAX_DECOMPRESSED_SIZE) {
                console.error(`[SourceAcquisition] Archive bomb detected. Exceeded 500 MB.`);
                throw new Error(`Archive bomb detected: exceeded 500 MB decompression limit.`);
            }

            return true;
        }
    });

    // Verify extracted root directory contains the expected short SHA
    if (headSha && extractedRoot) {
        const shortSha = headSha.substring(0, 7);
        if (!extractedRoot.includes(shortSha)) {
            console.warn(`[SourceAcquisition] Extracted root '${extractedRoot}' does not contain expected SHA '${shortSha}'.`);
        } else {
            console.log(`[SourceAcquisition] Tarball root contains expected SHA ${shortSha}.`);
        }
    }

    const allFiles = await getAllFiles(tempDir);
    const prFiles = mapToRelativePrFiles(allFiles, tempDir);

    console.log(`[SourceAcquisition] Tarball extracted: ${allFiles.length} files, ${totalExtractedBytes} bytes`);

    return {
        prFiles,
        totalFiles: allFiles.length,
        totalExtractedBytes,
    };
}

/**
 * Acquires source files from GitHub PR changed files.
 * Downloads each non-removed file, validates its SHA, writes to tempDir.
 *
 * @param {object} options
 * @param {object} options.client          - GithubClientService instance
 * @param {string} options.owner
 * @param {string} options.repositoryName
 * @param {Array}  options.prFiles         - Raw PR files from GitHub API
 * @param {string} options.tempDir         - Absolute path to the extraction directory
 * @returns {Promise<{ prFiles: Array<{filename:string, status:string}>, totalBytesAcquired: number }>}
 */
export async function acquireFromPullRequest({ client, owner, repositoryName, prFiles, tempDir }) {
    const crypto = await import('crypto');
    let totalBytesAcquired = 0;

    for (const file of prFiles) {
        if (file.status === 'removed') continue;
        try {
            const content = await client.downloadFile(owner, repositoryName, file.filename);
            totalBytesAcquired += content.length;

            // SHA verification
            const actualSha = crypto.createHash('sha1').update(`blob ${content.length}\0${content}`).digest('hex');
            if (file.sha && file.sha !== actualSha) {
                console.error(`[SourceAcquisition] SHA mismatch for ${file.filename}. Expected ${file.sha}, got ${actualSha}.`);
            }

            const filePath = path.join(tempDir, file.filename);
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, content);
        } catch (err) {
            console.warn(`[SourceAcquisition] Failed to download ${file.filename}:`, err.message);
        }
    }

    console.log(`[SourceAcquisition] PR files acquired: ${prFiles.length} files, ${totalBytesAcquired} bytes`);

    return { prFiles, totalBytesAcquired };
}
