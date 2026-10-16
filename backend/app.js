import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './config/env.js';
import v1Router from './routes/v1/index.js';
import healthRouter from './routes/health.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import logger from './config/logger.js';

const app = express();
const jsonParser = express.json({ limit: '1mb' });
const urlencodedParser = express.urlencoded({ extended: true, limit: '32kb' });

// Request logger for non-production debugging
if (config.env !== 'production') {
    app.use((req, res, next) => {
        logger.debug(`[${req.method}] ${req.path} - Origin: ${req.headers.origin || 'none'}`);
        next();
    });
}

app.use(cors(config.cors));
app.use(cookieParser());

// Webhook endpoint receives a raw body — skip JSON / urlencoded parsers for it.
const WEBHOOK_PATH = '/api/v1/github/webhook';
app.use((req, res, next) => {
    if (req.originalUrl.split('?')[0].replace(/\/$/, '') === WEBHOOK_PATH) return next();
    return jsonParser(req, res, next);
});
app.use((req, res, next) => {
    if (req.originalUrl.split('?')[0].replace(/\/$/, '') === WEBHOOK_PATH) return next();
    return urlencodedParser(req, res, next);
});

app.use(express.static('public'));

// ── Monitoring endpoints (unauthenticated) ────────────────────────────────────
// GET /liveness   — immediate alive check
// GET /health     — metadata (version, uptime, env)
// GET /readiness  — deep check: PostgreSQL + Redis + BullMQ
app.use('/', healthRouter);

// ── Versioned API ─────────────────────────────────────────────────────────────
app.use('/api/v1', v1Router);

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
