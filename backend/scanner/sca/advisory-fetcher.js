/**
 * scanner/sca/advisory-fetcher.js
 *
 * OSV.dev advisory fetcher with two-tier caching:
 *
 *   Tier 1 — Redis (in-memory, fast):
 *     TTL: 24 hours. Checked first. Zero DB reads on cache hit.
 *
 *   Tier 2 — PostgreSQL sca_advisory_cache table (durable):
 *     TTL: 7 days. Written on every OSV.dev API fetch.
 *     Survives Redis restarts. Also consulted if Redis miss.
 *
 *   OSV.dev API:
 *     Only called when both caches miss.
 *     POST https://api.osv.dev/v1/query
 *     Payload: { package: { name, ecosystem: 'npm' } }
 *
 * Failure modes:
 *   - OSV.dev unreachable → return empty advisory list (scan continues, no false positives)
 *   - Redis down → fall through to DB cache
 *   - DB down → fall through to OSV.dev
 *   - All fail → empty advisory list
 *
 * Rate limiting:
 *   OSV.dev public API has generous limits but is rate-limited.
 *   We batch lookups per-scan (one request per unique package name, not per dependency line).
 *   Redis + DB caching means a package is fetched from OSV at most once per 24h per process.
 *
 * Thread safety:
 *   The scanner thread runs in worker_threads isolation.
 *   Each thread has its own AdvisoryFetcher instance.
 *   In-flight deduplication is handled via a per-instance promise cache (_pending).
 */

import axios from 'axios';
import redis from '../../config/redis.js';
import { getPool } from '../../config/db.js';

const OSV_API_URL = 'https://api.osv.dev/v1/query';
const REDIS_TTL_SECONDS = parseInt(process.env.OSV_REDIS_TTL ?? String(60 * 60 * 24), 10);       // 24h
const DB_TTL_SECONDS    = parseInt(process.env.OSV_DB_TTL    ?? String(60 * 60 * 24 * 7), 10);   // 7d
const OSV_TIMEOUT_MS    = parseInt(process.env.OSV_TIMEOUT_MS ?? '8000', 10);
const ECOSYSTEM         = 'npm';

function redisKey(packageName) {
    return `oculus:osv:${ECOSYSTEM}:${packageName}`;
}

export class AdvisoryFetcher {
    constructor() {
        /** In-flight dedup: packageName → Promise<advisory[]> */
        this._pending = new Map();
    }

    /**
     * Fetch advisories for a single package, using the cache hierarchy.
     *
     * @param {string} packageName — npm package name, e.g. 'lodash'
     * @returns {Promise<object[]>} — OSV advisory objects (may be empty)
     */
    async fetchAdvisories(packageName) {
        if (!packageName) return [];

        // Deduplicate concurrent lookups for same package within this scan
        if (this._pending.has(packageName)) {
            return this._pending.get(packageName);
        }

        const promise = this._fetch(packageName);
        this._pending.set(packageName, promise);

        try {
            const result = await promise;
            return result;
        } finally {
            this._pending.delete(packageName);
        }
    }

    /**
     * Batch fetch advisories for multiple packages.
     * Returns a Map<packageName, advisory[]>.
     *
     * @param {string[]} packageNames
     * @returns {Promise<Map<string, object[]>>}
     */
    async fetchBatch(packageNames) {
        const unique = [...new Set(packageNames)];
        const results = await Promise.all(
            unique.map(async (name) => [name, await this.fetchAdvisories(name)])
        );
        return new Map(results);
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    async _fetch(packageName) {
        // 1. Redis
        if (redis.status === 'ready') {
            try {
                const cached = await redis.get(redisKey(packageName));
                if (cached !== null) {
                    return JSON.parse(cached);
                }
            } catch (redisErr) {
                console.warn(`[AdvisoryFetcher] Redis miss for ${packageName}: ${redisErr.message}`);
            }
        }

        // 2. DB cache
        try {
            const pool = getPool();
            const res = await pool.query(
                `SELECT advisories FROM sca_advisory_cache
                 WHERE package_name = $1 AND ecosystem = $2 AND expires_at > NOW()`,
                [packageName, ECOSYSTEM]
            );
            if (res.rows.length > 0) {
                const advisories = res.rows[0].advisories;
                // Back-populate Redis
                redis.setex(redisKey(packageName), REDIS_TTL_SECONDS, JSON.stringify(advisories))
                    .catch(() => {});
                return advisories;
            }
        } catch (dbErr) {
            console.warn(`[AdvisoryFetcher] DB cache miss for ${packageName}: ${dbErr.message}`);
        }

        // 3. OSV.dev API
        return this._fetchFromOsv(packageName);
    }

    async _fetchFromOsv(packageName) {
        try {
            const response = await axios.post(OSV_API_URL, {
                package: { name: packageName, ecosystem: ECOSYSTEM }
            }, {
                timeout: OSV_TIMEOUT_MS,
                headers: { 'Content-Type': 'application/json' }
            });

            const advisories = response.data?.vulns ?? [];

            // Write to both caches (non-blocking)
            this._persistToRedis(packageName, advisories);
            this._persistToDb(packageName, advisories);

            return advisories;
        } catch (err) {
            if (err.response?.status === 404) {
                // Package not found in OSV — no advisories, cache empty result
                this._persistToRedis(packageName, []);
                this._persistToDb(packageName, []);
                return [];
            }
            // Network error / timeout — return empty (fail open, no false positives)
            console.error(`[AdvisoryFetcher] OSV.dev fetch failed for ${packageName}: ${err.message}`);
            return [];
        }
    }

    _persistToRedis(packageName, advisories) {
        redis.setex(redisKey(packageName), REDIS_TTL_SECONDS, JSON.stringify(advisories))
            .catch(err => console.warn('[AdvisoryFetcher] Redis persist failed:', err.message));
    }

    _persistToDb(packageName, advisories) {
        const expiresAt = new Date(Date.now() + DB_TTL_SECONDS * 1000).toISOString();
        const pool = getPool();
        pool.query(
            `INSERT INTO sca_advisory_cache (package_name, ecosystem, advisories, fetched_at, expires_at, source)
             VALUES ($1, $2, $3, NOW(), $4, 'osv.dev')
             ON CONFLICT (package_name, ecosystem) DO UPDATE
               SET advisories = EXCLUDED.advisories,
                   fetched_at = NOW(),
                   expires_at = EXCLUDED.expires_at`,
            [packageName, ECOSYSTEM, JSON.stringify(advisories), expiresAt]
        ).catch(err => console.warn('[AdvisoryFetcher] DB persist failed:', err.message));
    }
}
