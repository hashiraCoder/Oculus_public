/**
 * config/redis.js — Shared ioredis client.
 *
 * ALL environments use REDIS_URL exclusively.
 *   Development:  redis://127.0.0.1:6379
 *   Production:   rediss://default:<pass>@host:port
 *
 * This is the ONLY place a Redis connection is created for general use.
 * BullMQ queues (scanner, baseline) share this connection.
 * GitHub token caching and health checks also use this client.
 */

import Redis from 'ioredis';
import config from './env.js';
import logger from './logger.js';

const { url, maxRetriesPerRequest, enableReadyCheck, lazyConnect } = config.redis;

const redis = new Redis(url, {
  maxRetriesPerRequest,
  enableReadyCheck,
  lazyConnect,
  enableOfflineQueue: false
});

// ─── Rate-limit noisy reconnect logging ──────────────────────────────────────
let _reconnectTimer = null;
let _reconnectCount = 0;

// ─── Connection lifecycle events ─────────────────────────────────────────────

redis.on('connect', () => {
  _reconnectCount = 0;
  logger.info(`[Redis] Connecting to ${config.redis.displayHost} …`);
});

redis.on('ready', () => {
  logger.info(`[Redis] ✓ Ready — ${config.redis.displayHost}`);
});

redis.on('error', (err) => {
  // Only log ECONNREFUSED once per reconnect cycle to suppress spam
  if (err.code === 'ECONNREFUSED') {
    if (!_reconnectTimer) {
      logger.warn(`[Redis] ✗ Unavailable (${config.redis.displayHost}) — retrying…`);
    }
  } else {
    logger.error(`[Redis] Error: ${err.message}`);
  }
});

redis.on('reconnecting', (delay) => {
  _reconnectCount++;
  // Clear previous throttle timer and set a new one so we log at most once per 10s
  if (_reconnectTimer) clearTimeout(_reconnectTimer);
  _reconnectTimer = setTimeout(() => {
    logger.warn(`[Redis] Reconnecting (attempt ${_reconnectCount}) — next retry in ${delay}ms`);
    _reconnectTimer = null;
  }, 100);
});

redis.on('close', () => {
  logger.warn('[Redis] Connection closed');
});

redis.on('end', () => {
  logger.warn('[Redis] Connection ended — no more reconnect attempts');
});

export default redis;