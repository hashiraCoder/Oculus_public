import { Router } from 'express';
import WorkspaceController from '../controllers/workspace.controller.js';
import TokenController from '../controllers/token.controller.js';
import WebhookController from '../controllers/webhook.controller.js';
import { verifyJwt } from '../../middleware/auth.middleware.js';
import { requireWorkspaceAccess } from '../../middleware/workspace.middleware.js';

const router = Router();

router.get('/', verifyJwt, WorkspaceController.listWorkspaces);
router.get('/:id', verifyJwt, WorkspaceController.getWorkspace);
router.patch('/:id', verifyJwt, WorkspaceController.updateWorkspace);
router.delete('/:id', verifyJwt, WorkspaceController.deleteWorkspace);
router.get('/:id/members', verifyJwt, WorkspaceController.getMembers);
router.get('/:id/policies/risk-weights', verifyJwt, WorkspaceController.getRiskWeights);
router.put('/:id/policies/risk-weights', verifyJwt, WorkspaceController.updateRiskWeights);

// Token routes
router.get('/:id/tokens', verifyJwt, requireWorkspaceAccess, TokenController.listTokens);
router.post('/:id/tokens', verifyJwt, requireWorkspaceAccess, TokenController.createToken);
router.post('/:id/tokens/:tokenId/revoke', verifyJwt, requireWorkspaceAccess, TokenController.revokeToken);
router.post('/:id/tokens/:tokenId/rotate', verifyJwt, requireWorkspaceAccess, TokenController.rotateToken);

// Webhook routes
router.get('/:id/webhooks', verifyJwt, requireWorkspaceAccess, WebhookController.listWebhooks);
router.post('/:id/webhooks', verifyJwt, requireWorkspaceAccess, WebhookController.createWebhook);
router.delete('/:id/webhooks/:webhookId', verifyJwt, requireWorkspaceAccess, WebhookController.deleteWebhook);
router.patch('/:id/webhooks/:webhookId/toggle', verifyJwt, requireWorkspaceAccess, WebhookController.toggleWebhook);

export default router;
