/**
 * routes/v1/index.js — Version 1 API router
 *
 * This is the single entry point for all /api/v1/* routes.
 * Every feature router is mounted here.
 *
 * To add a future v2:
 *   1. Create routes/v2/index.js
 *   2. Mount it in app.js as app.use('/api/v2', v2Router)
 *   v1 routes continue to work without any changes.
 */

import { Router } from 'express';
import userRouter       from '../user.routes.js';
import paginationRouter from '../pagination.routes.js';
import githubRouter     from '../../github/routes/github.routes.js';
import workspaceRouter  from '../../workspaces/routes/workspace.routes.js';
import notificationRouter from '../../notifications/routes/notification.routes.js';
import scanRouter       from '../../scanner/routes/scan.routes.js';
import findingsRouter   from '../../findings/routes/findings.routes.js';
import analyticsRouter  from '../../analytics/routes/analytics.routes.js';
import exportRouter     from '../../analytics/routes/export.routes.js';
import adminRouter      from './admin.routes.js';

const v1Router = Router();

// ── Auth & user session ───────────────────────────────────────────────────────
v1Router.use('/auth',       userRouter);

// ── Workspaces ────────────────────────────────────────────────────────────────
v1Router.use('/workspaces', workspaceRouter);
v1Router.use('/workspaces/:workspaceId/notifications', notificationRouter);

// ── Data access ───────────────────────────────────────────────────────────────
// Cursor-paginated lists: repositories, scans, vulnerabilities
v1Router.use('/pagination', paginationRouter);

// ── Scans ─────────────────────────────────────────────────────────────────────
v1Router.use('/scans',      scanRouter);

// ── Findings ──────────────────────────────────────────────────────────────────
v1Router.use('/findings',   findingsRouter);

// ── Analytics & Export ────────────────────────────────────────────────────────
v1Router.use('/analytics',  analyticsRouter);
v1Router.use('/export',     exportRouter);

// ── Super Admin Control Center ────────────────────────────────────────────────
v1Router.use('/admin',      adminRouter);

// ── GitHub App integration ────────────────────────────────────────────────────
// /connect, /disconnect, /sync, /webhook
v1Router.use('/github',     githubRouter);

export default v1Router;
