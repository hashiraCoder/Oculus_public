import { Pool } from 'pg';
import config from './env.js';
import logger from './logger.js';
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

const pool = new Pool({
    user: config.db.user,
    password: config.db.password,
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    max: config.db.maxPoolSize, // Set pool max size
    idleTimeoutMillis: 30000,      // Close idle clients after 30 seconds
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '10000', 10), // 10s connection timeout for cloud DBs
    ssl: config.env === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err, client) => {
    logger.warn(`[PostgreSQL Pool] Idle client warning (auto-recovering): ${err.message}`);
});

export async function query(text, params = []) {
  const start = Date.now();

  try {
    const result = await pool.query(text, params);

    const duration = Date.now() - start;

    logger.debug("Executed query", {
      text,
      duration,
      rows: result.rowCount,
    });

    return result;
  } catch (error) {
    logger.error("Database query failed", {
      text,
      error: error.message,
    });

    throw error;
  }
}

export function getPool() {
  return pool;
}

export async function connectDB(maxRetries = 5, retryDelayMs = 2000) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      await pool.query('SELECT 1');
      logger.info('PostgreSQL connection established');
      return;
    } catch (err) {
      attempt++;
      logger.warn(`[PostgreSQL] Connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt >= maxRetries) {
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, retryDelayMs));
    }
  }
}

export default pool;