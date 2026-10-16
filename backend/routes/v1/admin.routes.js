import { Router } from 'express';
import { verifyJwt } from '../../middleware/auth.middleware.js';
import { requireSuperAdmin } from '../../middleware/require-super-admin.js';

import { getHealth } from '../../admin/controllers/engine-health.controller.js';
import { listWorkers } from '../../admin/controllers/workers.controller.js';
import { getQueues } from '../../admin/controllers/queues.controller.js';
import { listScans, getScanTelemetry } from '../../admin/controllers/scans-admin.controller.js';
import { listRules } from '../../admin/controllers/rules-admin.controller.js';
import { listAlerts, resolveAlert } from '../../admin/controllers/alerts.controller.js';
import { listShadowResults, getShadowResultDetails, getPromotionGate } from '../../admin/controllers/shadow.controller.js';

const router = Router();

// Secure all admin routes
router.use(verifyJwt);
router.use(requireSuperAdmin);

// Engine Health
router.get('/health', getHealth);

// Worker Observatory
router.get('/workers', listWorkers);

// Queue Monitor
router.get('/queues', getQueues);

// Scans & Telemetry
router.get('/scans', listScans);
router.get('/scans/:scanId/telemetry', getScanTelemetry);

// Rules Configuration
router.get('/rules', listRules);

// Engine Alerts
router.get('/alerts', listAlerts);
router.post('/alerts/:id/resolve', resolveAlert);

// Shadow Scanning + Promotion Gate
router.get('/shadow/promotion-gate', getPromotionGate);
router.get('/shadow', listShadowResults);
router.get('/shadow/:id', getShadowResultDetails);

export default router;
