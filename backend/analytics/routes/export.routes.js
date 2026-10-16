import { Router } from 'express';
import { unifiedAuth } from '../../middleware/unified-auth.middleware.js';
import { requireScope } from '../../middleware/scope.middleware.js';
import { requireWorkspaceAccess } from '../../middleware/workspace.middleware.js';
import { tokenRateLimiter } from '../../middleware/rateLimit.middleware.js';
import { exportFindings } from '../controllers/export.controller.js';
import { DEVELOPER_TOKEN_SCOPES } from '../../config/scopes.js';

const router = Router();

router.use(unifiedAuth);
router.use(tokenRateLimiter);

// Mount with /api/workspaces/:workspaceId/export
router.get('/:workspaceId/findings', requireWorkspaceAccess, requireScope(DEVELOPER_TOKEN_SCOPES.EXPORTS_READ), exportFindings);

export default router;
