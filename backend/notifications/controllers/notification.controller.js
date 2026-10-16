import NotificationService from '../notification.service.js';
import { asynchandler } from '../../utils/asyncHandler.js';

class NotificationController {
    static getNotifications = asynchandler(async (req, res) => {
        const { workspaceId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const notifications = await NotificationService.getRecentNotifications(workspaceId, limit);
        res.status(200).json(notifications);
    });

    static markAsRead = asynchandler(async (req, res) => {
        const { workspaceId, id } = req.params;
        await NotificationService.markAsRead(workspaceId, id);
        res.status(200).json({ success: true });
    });

    static markAllAsRead = asynchandler(async (req, res) => {
        const { workspaceId } = req.params;
        await NotificationService.markAllAsRead(workspaceId);
        res.status(200).json({ success: true });
    });
}

export default NotificationController;

