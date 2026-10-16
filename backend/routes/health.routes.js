/**
 * routes/health.routes.js
 *
 * Production monitoring endpoints — no authentication required.
 *
 * GET /liveness   — Fast alive check (no I/O). Used by load balancers.
 * GET /health     — App metadata: version, uptime, timestamp.
 * GET /readiness  — Deep check: PostgreSQL + Redis + BullMQ connectivity.
 */

import { Router } from 'express';
import { getPool } from '../config/db.js';
import redis from '../config/redis.js';
import config from '../config/env.js';

const router = Router();

// ── GET /liveness ─────────────────────────────────────────────────────────────
// Immediate response — no I/O. Only fails if the Node process is dead.
router.get('/liveness', (_req, res) => {
  res.status(200).json({ alive: true });
});

// ── GET /health ───────────────────────────────────────────────────────────────
// App metadata. Fast — no database queries.
router.get('/health', (_req, res) => {
  res.status(200).json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    uptime:    Math.floor(process.uptime()),
    version:   config.version,
    env:       config.env,
  });
});

// ── GET /readiness ────────────────────────────────────────────────────────────
// Deep connectivity check. Returns 200 only when all critical systems are up.
router.get('/readiness', async (_req, res) => {
  const checks = { database: 'unknown', redis: 'unknown', queues: 'unknown' };
  let allReady = true;

  // PostgreSQL
  try {
    await getPool().query('SELECT 1');
    checks.database = 'connected';
  } catch {
    checks.database = 'disconnected';
    allReady = false;
  }

  // Redis
  try {
    const pong = await redis.ping();
    checks.redis = pong === 'PONG' ? 'connected' : 'degraded';
    if (pong !== 'PONG') allReady = false;
  } catch {
    checks.redis = 'disconnected';
    allReady = false;
  }

  // BullMQ — infer from Redis connectivity (BullMQ uses the same connection)
  checks.queues = checks.redis === 'connected' ? 'ready' : 'unavailable';

  const statusCode = allReady ? 200 : 503;
  res.status(statusCode).json({
    ready:    allReady,
    database: checks.database,
    redis:    checks.redis,
    queues:   checks.queues,
  });
});

export default router;
