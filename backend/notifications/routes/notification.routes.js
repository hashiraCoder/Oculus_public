import { Router } from 'express';
import NotificationController from '../controllers/notification.controller.js';
import { verifyJwt } from '../../middleware/auth.middleware.js';
import { requireWorkspaceAccess } from '../../middleware/workspace.middleware.js';

const router = Router({ mergeParams: true });

router.use(verifyJwt, requireWorkspaceAccess);

router.get('/', NotificationController.getNotifications);
router.post('/mark-all-read', NotificationController.markAllAsRead);
router.patch('/:id/read', NotificationController.markAsRead);

export default router;

