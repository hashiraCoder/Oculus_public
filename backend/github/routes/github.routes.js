import express from 'express';
import { verifyJwt } from '../../middleware/auth.middleware.js';
import InstallationController from '../controllers/installation.controller.js';
import WebhookController from '../controllers/webhook.controller.js';
import { githubSignatureMiddleware } from '../middleware/github-signature.middleware.js';

const router = express.Router();

router.get('/install-url', verifyJwt, InstallationController.getInstallUrl);
router.get('/callback', InstallationController.callback); // No verifyJwt here because the GitHub redirect might not have cookies due to SameSite=Strict cross-origin. We verify via JWT state in the controller/service.
router.post('/connect', verifyJwt, InstallationController.connect); // Deprecated
router.delete('/disconnect', verifyJwt, InstallationController.disconnect);
router.post('/sync', verifyJwt, InstallationController.sync);

// Apply raw body parser, then signature verification, then controller
router.post('/webhook', 
    express.raw({ type: 'application/json', limit: '10mb' }), 
    githubSignatureMiddleware,
    WebhookController.handleWebhook
);

export default router;