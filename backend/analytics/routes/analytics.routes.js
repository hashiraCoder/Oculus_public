import { Router } from 'express';
import { unifiedAuth } from '../../middleware/unified-auth.middleware.js';
import { requireScope } from '../../middleware/scope.middleware.js';
import { requireWorkspaceAccess } from '../../middleware/workspace.middleware.js';
import { tokenRateLimiter } from '../../middleware/rateLimit.middleware.js';
import { DEVELOPER_TOKEN_SCOPES } from '../../config/scopes.js';
import {
    getSecurityPosture,
    getWorkspaceSummary,
    getRiskTrend,
    getFindingDistribution,
    getRepositoryRanking
} from '../controllers/analytics.controller.js';

import { getDeveloperLeaderboard } from '../controllers/developer.controller.js';
import { getScanHistory } from '../controllers/scan-history.controller.js';
import { getRepositoryRiskHistory } from '../../repositories/controllers/repository-risk.controller.js';

const router = Router();

router.use(unifiedAuth);
router.use(tokenRateLimiter);

// Mount with /api/workspaces/:workspaceId/analytics
router.get('/:workspaceId/security-posture', requireWorkspaceAccess, requireScope(DEVELOPER_TOKEN_SCOPES.ANALYTICS_READ), getSecurityPosture);
router.get('/:workspaceId/summary', requireWorkspaceAccess, requireScope(DEVELOPER_TOKEN_SCOPES.ANALYTICS_READ), getWorkspaceSummary);
router.get('/:workspaceId/risk-trend', requireWorkspaceAccess, requireScope(DEVELOPER_TOKEN_SCOPES.ANALYTICS_READ), getRiskTrend);
router.get('/:workspaceId/finding-distribution', requireWorkspaceAccess, requireScope(DEVELOPER_TOKEN_SCOPES.ANALYTICS_READ), getFindingDistribution);
router.get('/:workspaceId/repository-ranking', requireWorkspaceAccess, requireScope(DEVELOPER_TOKEN_SCOPES.ANALYTICS_READ), getRepositoryRanking);
router.get('/:workspaceId/developers/leaderboard', requireWorkspaceAccess, requireScope(DEVELOPER_TOKEN_SCOPES.ANALYTICS_READ), getDeveloperLeaderboard);
router.get('/:workspaceId/scans/history', requireWorkspaceAccess, requireScope(DEVELOPER_TOKEN_SCOPES.ANALYTICS_READ), getScanHistory);
router.get('/:workspaceId/repositories/:repositoryId/risk-history', requireWorkspaceAccess, requireScope(DEVELOPER_TOKEN_SCOPES.ANALYTICS_READ), getRepositoryRiskHistory);

export default router;
