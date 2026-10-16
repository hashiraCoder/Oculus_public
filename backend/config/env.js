/**
 * config/env.js — Single source of truth for all Oculus configuration.
 *
 * Loading strategy (12-factor app, Option B):
 *   Development  →  npm run dev  uses dotenv-cli to inject .env.development
 *   Production   →  npm start    receives env vars injected by Render / Docker
 *   This file only READS process.env — it never loads .env files itself.
 *
 */

// ─── Grouped Validation ───────────────────────────────────────────────────────

const REQUIRED_GROUPS = {
  'Database': ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT', 'DB_NAME'],
  'JWT':      ['JWT_SECRET'],
  'Redis':    ['REDIS_URL'],
};

const missingGroups = Object.entries(REQUIRED_GROUPS)
  .map(([group, keys]) => ({ group, missing: keys.filter((k) => !process.env[k]) }))
  .filter(({ missing }) => missing.length > 0);

if (missingGroups.length > 0 && process.env.NODE_ENV !== 'test') {
  console.error('\n╔══════════════════════════════════════════════╗');
  console.error('║  [FATAL] Missing required env variables      ║');
  console.error('╚══════════════════════════════════════════════╝');
  missingGroups.forEach(({ group, missing }) => {
    console.error(`\n  Missing ${group} variables:`);
    missing.forEach((k) => console.error(`    ✗ ${k}`));
  });
  console.error('\nCheck your .env.development or .env.production file.\n');
  process.exit(1);
}

// ─── Runtime helpers ─────────────────────────────────────────────────────────

const env    = process.env.NODE_ENV || 'development';
const isProd = env === 'production';

// Safe URL parse for display — never throws
const redisUrlHost = (() => {
  try { return new URL(process.env.REDIS_URL).hostname; }
  catch { return 'invalid-url'; }
})();

// Parse and normalize CORS origins
const parseCorsOrigins = (rawUrl, isProd) => {
  if (!rawUrl) return isProd ? [] : ['http://localhost:5173'];
  const urls = rawUrl.split(',')
    .map(url => url.trim().replace(/\/$/, '')) // Remove whitespace and trailing slashes
    .filter(Boolean);
  
  if (isProd && urls.length > 1) {
    console.warn('[CORS] Multiple origins detected in production. Restricting to the first origin for strict security.');
    return urls.slice(0, 1);
  }
  
  return urls;
};

// ─── Configuration object ─────────────────────────────────────────────────────

const config = {
  // ── Runtime ────────────────────────────────────────────────────────────────
  env,
  isProd,
  port: parseInt(process.env.PORT, 10) || 3000,
  version: process.env.npm_package_version || '1.0.0',

  // ── CORS ───────────────────────────────────────────────────────────────────
  cors: {
    origin:      parseCorsOrigins(process.env.CORS_URL, isProd),
    credentials: true,
  },

  // ── Database ───────────────────────────────────────────────────────────────
  db: {
    user:        process.env.DB_USER,
    password:    process.env.DB_PASSWORD,
    host:        process.env.DB_HOST,
    port:        parseInt(process.env.DB_PORT, 10) || 5432,
    database:    process.env.DB_NAME,
    maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE, 10) || 20,
    ssl:         isProd ? { rejectUnauthorized: false } : false,
  },

  // ── Redis (REDIS_URL only) ─────────────────────────────────────────────────
  // All environments use a single REDIS_URL connection string.
  //   Development:  redis://127.0.0.1:6379
  //   Production:   rediss://default:<pass>@host:port  (Upstash TLS)
  redis: {
    url:                  process.env.REDIS_URL,
    // Display label only — never exposed in HTTP responses
    displayHost:          redisUrlHost,
    maxRetriesPerRequest: null,
    enableReadyCheck:     false,
    lazyConnect:          true,
   
  },

  // ── GitHub App ────────────────────────────────────────────────────────────
  github: {
    appId:         process.env.GITHUB_APP_ID         || null,
    privateKey:    process.env.GITHUB_PRIVATE_KEY    || null,
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || (process.env.NODE_ENV === 'test' ? 'test_webhook_secret' : null),
    apiBaseUrl:    process.env.GITHUB_API_BASE_URL   || 'https://api.github.com',
    clientId:      process.env.GITHUB_CLIENT_ID      || null,
    clientSecret:  process.env.GITHUB_CLIENT_SECRET  || null,
  },

  // ── JWT ───────────────────────────────────────────────────────────────────
  jwt: {
    secret:           process.env.JWT_SECRET,
    refreshSecret:    process.env.JWT_REFRESH_SECRET    || process.env.JWT_SECRET,
    accessExpiresIn:  process.env.JWT_ACCESS_EXPIRES_IN  || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    // Backward-compat alias
    expiresIn:        process.env.JWT_ACCESS_EXPIRES_IN  || '15m',
  },

  // ── Scanner ───────────────────────────────────────────────────────────────
  scanner: {
    maxFileSizeBytes:  parseInt(process.env.SCANNER_MAX_FILE_SIZE, 10) || 512_000,
    timeoutMs:         parseInt(process.env.SCANNER_TIMEOUT_MS, 10)    || 30_000,
    workerConcurrency: parseInt(process.env.SCANNER_CONCURRENCY, 10)   || 2,
  },

  // ── WebSocket ─────────────────────────────────────────────────────────────
  websocket: {
    pingInterval: parseInt(process.env.WS_PING_INTERVAL, 10) || 25_000,
    pingTimeout:  parseInt(process.env.WS_PING_TIMEOUT, 10)  || 5_000,
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications: {
    redisPubSubChannel: process.env.REDIS_PUBSUB_CHANNEL || 'oculus-notifications',
    maxDeadLetterAge:   parseInt(process.env.DLQ_MAX_AGE_DAYS, 10) || 30,
  },

  // ── Email ─────────────────────────────────────────────────────────────────
  email: {
    resendApiKey: process.env.RESEND_API_KEY,
    from:         process.env.EMAIL_FROM,
    frontendUrl:  process.env.FRONTEND_URL,
  },

  // ── Security & Cryptography ───────────────────────────────────────────────
  security: {
    findingEncryptionKey: process.env.FINDING_ENCRYPTION_KEY || null,
  },

  // 🛡️ Rate Limiting
  rateLimit: {
    apiTokens: {
      windowMs: parseInt(process.env.RATE_LIMIT_TOKEN_WINDOW_MS, 10) || 60000,
      max: parseInt(process.env.RATE_LIMIT_TOKEN_MAX, 10) || 100,
    },
    scans: {
      windowMs: parseInt(process.env.RATE_LIMIT_SCAN_WINDOW_MS, 10) || 60000,
      max: parseInt(process.env.RATE_LIMIT_SCAN_MAX, 10) || 10,
    }
  },
};

// ─── Freeze — prevent accidental runtime mutations ────────────────────────────
Object.freeze(config.cors);
Object.freeze(config.db);
Object.freeze(config.redis);
Object.freeze(config.github);
Object.freeze(config.jwt);
Object.freeze(config.scanner);
Object.freeze(config.websocket);
Object.freeze(config.notifications);
Object.freeze(config.email);
Object.freeze(config.security);
Object.freeze(config.rateLimit);
Object.freeze(config);

export default config;