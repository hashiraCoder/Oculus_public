import { Router } from 'express';
import { unifiedAuth } from '../../middleware/unified-auth.middleware.js';
import { requireScope } from '../../middleware/scope.middleware.js';
import { requireWorkspaceAccess } from '../../middleware/workspace.middleware.js';
import { tokenRateLimiter } from '../../middleware/rateLimit.middleware.js';
import { DEVELOPER_TOKEN_SCOPES } from '../../config/scopes.js';
import {
    getFindings,
    getFingerprintHistory,
    updateFindingStatus,
    getFindingAudit,
    bulkUpdateFindingStatus
} from '../controllers/findings.controller.js';

const router = Router();

router.use(unifiedAuth);
router.use(tokenRateLimiter);

// Mount with /api/v1/findings/:workspaceId
router.get('/:workspaceId', requireWorkspaceAccess, requireScope(DEVELOPER_TOKEN_SCOPES.FINDINGS_READ), getFindings);
router.patch('/:workspaceId/bulk-status', requireWorkspaceAccess, requireScope(DEVELOPER_TOKEN_SCOPES.FINDINGS_WRITE), bulkUpdateFindingStatus);
router.get('/:workspaceId/fingerprint/:fingerprint/history', requireWorkspaceAccess, requireScope(DEVELOPER_TOKEN_SCOPES.FINDINGS_READ), getFingerprintHistory);
router.patch('/:workspaceId/:findingId/status', requireWorkspaceAccess, requireScope(DEVELOPER_TOKEN_SCOPES.FINDINGS_WRITE), updateFindingStatus);
router.get('/:workspaceId/:findingId/audit', requireWorkspaceAccess, requireScope(DEVELOPER_TOKEN_SCOPES.FINDINGS_READ), getFindingAudit);

export default router;
