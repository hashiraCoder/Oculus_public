import { Router } from 'express';
import ScanController from '../controllers/scan.controller.js';
import { asynchandler } from '../../utils/asyncHandler.js';
import { unifiedAuth } from '../../middleware/unified-auth.middleware.js';
import { tokenRateLimiter, scanRateLimiter } from '../../middleware/rateLimit.middleware.js';
import { requireScope } from '../../middleware/scope.middleware.js';
import { DEVELOPER_TOKEN_SCOPES } from '../../config/scopes.js';

const router = Router();

router.use(unifiedAuth);
router.use(tokenRateLimiter);

router.get('/:id', requireScope(DEVELOPER_TOKEN_SCOPES.SCANS_READ), asynchandler(ScanController.getScanDetails));
router.get('/:id/timeline', requireScope(DEVELOPER_TOKEN_SCOPES.SCANS_READ), asynchandler(ScanController.getScanTimeline));
router.get('/:id/logs', requireScope(DEVELOPER_TOKEN_SCOPES.SCANS_READ), asynchandler(ScanController.getScanLogs));

router.post('/', requireScope(DEVELOPER_TOKEN_SCOPES.SCANS_CREATE), scanRateLimiter, asynchandler(ScanController.triggerScan));
router.post('/:id/cancel', requireScope(DEVELOPER_TOKEN_SCOPES.SCANS_CANCEL), asynchandler(ScanController.cancelScan));
router.post('/:id/retry', requireScope(DEVELOPER_TOKEN_SCOPES.SCANS_RETRY), asynchandler(ScanController.retryScan));

// The CI Gate endpoint
router.get('/:id/gate', requireScope(DEVELOPER_TOKEN_SCOPES.SCANS_READ), asynchandler(ScanController.getScanGateStatus));

export default router;
