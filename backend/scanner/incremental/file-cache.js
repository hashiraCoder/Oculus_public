/**
 * scanner/incremental/file-cache.js
 *
 * Per-repository file hash cache backed by Redis.
 *
 * Stores a SHA-256 hash of each file's content, keyed by:
 *   oculus:file_cache:{repositoryId}:{relativePath}
 *
 * TTL: 7 days (604800 seconds). Baseline scans always repopulate the cache.
 * PR scans read from the cache to decide which files changed since last baseline.
 *
 * Design:
 *   A cache HIT (same hash) → file is unchanged → skip analysis.
 *   A cache MISS (no entry)  → file is new → analyze.
 *   A cache MISMATCH (different hash) → file changed → analyze and update cache.
 *
 * Rollback: ENABLE_INCREMENTAL_ANALYSIS=false → all files analyzed regardless.
 */

import redis from '../../config/redis.js';

const CACHE_TTL_SECONDS = parseInt(process.env.FILE_CACHE_TTL_SECONDS ?? String(60 * 60 * 24 * 7), 10);
const KEY_PREFIX = 'oculus:file_cache';

function cacheKey(repositoryId, relativePath) {
    // Normalize path separators to forward slashes for cross-platform stability
    const normalized = relativePath.replace(/\\/g, '/');
    return `${KEY_PREFIX}:${repositoryId}:${normalized}`;
}

export class FileCache {
    constructor(repositoryId) {
        this.repositoryId = repositoryId;
    }

    /**
     * Check if a file's hash matches the cached value.
     *
     * @param {string} relativePath
     * @param {string} currentHash — SHA-256 hex digest of current file content
     * @returns {Promise<'HIT'|'MISS'|'CHANGED'>}
     */
    async check(relativePath, currentHash) {
        if (redis.status !== 'ready') return 'MISS';
        try {
            const key = cacheKey(this.repositoryId, relativePath);
            const cached = await redis.get(key);
            if (cached === null) return 'MISS';
            if (cached === currentHash) return 'HIT';
            return 'CHANGED';
        } catch (err) {
            // Redis failure is non-fatal: treat as MISS so we analyze the file
            console.error(`[FileCache] Redis check failed for ${relativePath}:`, err.message);
            return 'MISS';
        }
    }

    /**
     * Write a file hash into the cache (or update existing).
     *
     * @param {string} relativePath
     * @param {string} hash — SHA-256 hex digest
     */
    async set(relativePath, hash) {
        if (redis.status !== 'ready') return;
        try {
            const key = cacheKey(this.repositoryId, relativePath);
            await redis.setex(key, CACHE_TTL_SECONDS, hash);
        } catch (err) {
            console.error(`[FileCache] Redis set failed for ${relativePath}:`, err.message);
        }
    }

    /**
     * Bulk-write file hashes (used at end of baseline scan to seed the cache).
     *
     * @param {Array<{ relativePath: string, hash: string }>} entries
     */
    async bulkSet(entries) {
        if (!entries.length) return;
        try {
            const pipeline = redis.pipeline();
            for (const { relativePath, hash } of entries) {
                pipeline.setex(cacheKey(this.repositoryId, relativePath), CACHE_TTL_SECONDS, hash);
            }
            await pipeline.exec();
        } catch (err) {
            console.error(`[FileCache] Redis bulk set failed:`, err.message);
        }
    }

    /**
     * Invalidate the entire cache for a repository (e.g., force-rescan).
     */
    async invalidate() {
        try {
            const pattern = `${KEY_PREFIX}:${this.repositoryId}:*`;
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(...keys);
                console.log(`[FileCache] Invalidated ${keys.length} cache entries for repo ${this.repositoryId}`);
            }
        } catch (err) {
            console.error(`[FileCache] Invalidate failed:`, err.message);
        }
    }
}
