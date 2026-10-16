import config from './config/env.js';
import app from './app.js';
import { connectDB, getPool } from './config/db.js';
import redis from './config/redis.js';
import * as workers from './workers/index.js';
import * as queues from './queues/index.js';
import { startOutboxWorker, stopOutboxWorker } from './workers/outbox.worker.js';
import { initializeWebSocket, getIO } from './notifications/websocket.gateway.js';
import { StaleScanRecovery } from './scanner/lifecycle/stale-scan-recovery.js';
import { QueueMonitor } from './scanner/telemetry/queue-monitor.js';
import logger from './config/logger.js';

let httpServer;
let isShuttingDown = false;
let recoveryInterval;
let monitorInterval;

function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`\n[Server] Received ${signal}. Starting graceful shutdown...`);

  const shutdownTimeout = setTimeout(() => {
    logger.error('[Server] Graceful shutdown timed out after 30s. Forcing exit.');
    process.exit(1);
  }, 30000);

  async function performShutdown() {
    try {
      if (recoveryInterval) clearInterval(recoveryInterval);
      if (monitorInterval) clearInterval(monitorInterval);

      logger.info('[Server] Stopping Outbox worker (draining in-flight batch)...');
      await stopOutboxWorker();

      if (httpServer) {
        logger.info('[Server] Closing HTTP server...');
        await new Promise((resolve) => httpServer.close(resolve));
      }

      logger.info('[Server] Closing BullMQ workers (waiting for active jobs)...');
      await Promise.all(Object.values(workers).map(worker => worker.close()));

      logger.info('[Server] Closing BullMQ queues...');
      await Promise.all(Object.values(queues).map(queue => queue.close()));

      try {
        const io = getIO();
        if (io) {
          logger.info('[Server] Closing WebSocket connections...');
          io.close();
        }
      } catch (err) {}

      logger.info('[Server] Closing Redis connection...');
      await redis.quit();

      logger.info('[Server] Closing PostgreSQL connection pool...');
      const pool = getPool();
      if (pool) {
        await pool.end();
      }

      clearTimeout(shutdownTimeout);
      logger.info('[Server] Graceful shutdown complete. Exiting.');
      process.exit(0);
    } catch (err) {
      logger.error('[Server] Error during graceful shutdown:', err);
      process.exit(1);
    }
  }

  performShutdown();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

function printBanner({ dbStatus, redisStatus, wsStatus }) {
  const pad = (str, len = 44) => String(str).padEnd(len);
  const githubStatus = config.github.appId
    ? `Configured (App ID ${config.github.appId})`
    : 'Not configured';

  console.log(`
╔══════════════════════════════════════════════════════╗
║              Oculus Public Demo Backend              ║
╠══════════════════════════════════════════════════════╣
║  Environment : ${pad(config.env)}║
║  Version     : ${pad(config.version)}║
║  Port        : ${pad(config.port)}║
║  CORS        : ${pad(config.cors.origin || 'not set')}║
╠══════════════════════════════════════════════════════╣
║  PostgreSQL  : ${pad(dbStatus)}║
║  Redis       : ${pad(redisStatus)}║
║  BullMQ      : ${pad('Ready')}║
║  Socket.IO   : ${pad(wsStatus)}║
║  GitHub App  : ${pad(githubStatus)}║
║  Scanner     : ${pad('Ready (Reference Engine)')}║
╚══════════════════════════════════════════════════════╝
`);
}

let dbStatus    = 'Disconnected';
let redisStatus = 'Disconnected';
let wsStatus    = 'Not initialized';

connectDB()
  .then(async () => {
    dbStatus = 'Connected';

    try {
      if (redis.status === 'wait') {
        await redis.connect();
      }
      redisStatus = `Connected (${config.redis.displayHost})`;
    } catch (err) {
      console.error('REDIS CONNECT ERROR:', err.message);
      redisStatus = `Unavailable (${config.redis.displayHost})`;
    }

    startOutboxWorker().catch((err) => {
      logger.error('[Server] Failed to start Outbox Worker:', err);
    });

    const queueMonitor = new QueueMonitor('scanner');
    recoveryInterval = setInterval(() => {
      StaleScanRecovery.recoverZombies().catch((err) => {
        logger.error('[Server] StaleScanRecovery error:', err);
      });
    }, 60000);

    monitorInterval = setInterval(() => {
      queueMonitor.checkQueueHealth().catch((err) => {
        logger.error('[Server] QueueMonitor error:', err);
      });
    }, 60000);

    httpServer = app.listen(config.port, () => {
      logger.info(`[Server] 🚀 Listening on port ${config.port} [${config.env}]`);
    });

    try {
      initializeWebSocket(httpServer);
      wsStatus = 'Ready';
    } catch (err) {
      wsStatus = 'Failed';
      logger.error('[Server] WebSocket initialization failed:', err);
    }

    printBanner({ dbStatus, redisStatus, wsStatus });
  })
  .catch((err) => {
    console.error('[Server] Failed to connect to database — aborting startup\n', err);
    process.exit(1);
  });
