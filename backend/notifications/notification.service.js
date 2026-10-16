import SocketPublisher from './socket.publisher.js';
import { NotificationEvents } from './notification.events.js';
import { getPool } from '../config/db.js';
import logger from '../config/logger.js';

class NotificationService {
    static async persistNotification(workspaceId, eventType, notificationType, severity, payload) {
        const pool = getPool();
        try {
            const scanId = payload?.scanId;
            if (scanId) {
                await pool.query(`
                    INSERT INTO notifications (workspace_id, event_type, notification_type, severity, payload)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (workspace_id, (payload->>'scanId'), event_type)
                    WHERE (payload->>'scanId') IS NOT NULL
                    DO NOTHING
                `, [workspaceId, eventType, notificationType, severity, JSON.stringify(payload)]);
            } else {
                await pool.query(`
                    INSERT INTO notifications (workspace_id, event_type, notification_type, severity, payload)
                    VALUES ($1, $2, $3, $4, $5)
                `, [workspaceId, eventType, notificationType, severity, JSON.stringify(payload)]);
            }
            logger.info(`[NotificationService] Persisted notification ${eventType} for workspace ${workspaceId}`);
        } catch (error) {
            logger.error(`[NotificationService] Failed to persist notification`, error);
        }
    }
    static async getRecentNotifications(workspaceId, limit = 50) {
        const pool = getPool();
        const res = await pool.query(`
            SELECT id, event_type, notification_type, severity, payload, (read_at IS NOT NULL) AS is_read, created_at
            FROM notifications
            WHERE workspace_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        `, [workspaceId, limit]);
        return res.rows;
    }

    static async markAsRead(workspaceId, notificationId) {
        const pool = getPool();
        await pool.query(
            `UPDATE notifications SET read_at = COALESCE(read_at, NOW())
             WHERE id = $1 AND workspace_id = $2`,
            [notificationId, workspaceId]
        );
    }

    static async markAllAsRead(workspaceId) {
        const pool = getPool();
        await pool.query(
            `UPDATE notifications SET read_at = COALESCE(read_at, NOW())
             WHERE workspace_id = $1 AND read_at IS NULL`,
            [workspaceId]
        );
    }
    static async publishScanStarted(workspaceId, repoId, repoName, scanId) {
        const data = { scanId, repoId, repoName, status: 'SCANNING', timestamp: Date.now() };
        
        await this.persistNotification(workspaceId, NotificationEvents.SCAN_STARTED, 'SCAN_STARTED', 'NORMAL', data);

        const payload = {
            room: `workspace:${workspaceId}`,
            event: NotificationEvents.SCAN_STARTED,
            data
        };
        await SocketPublisher.publish('oculus-notifications', payload);
    }

    static async publishScanProgress(workspaceId, repoId, repoName, scanId, filesScanned, totalFiles) {
        const data = { scanId, repoId, repoName, filesScanned, totalFiles, timestamp: Date.now() };
        // Progress events are too spammy to persist
        const payload = {
            room: `workspace:${workspaceId}`,
            event: NotificationEvents.SCAN_PROGRESS,
            data
        };
        await SocketPublisher.publish('oculus-notifications', payload);
    }

    static async publishScanCompleted(workspaceId, repoId, repoName, scanId, summary) {
        const data = { 
            scanId, 
            repoId, 
            repoName,
            status: summary.status, 
            riskScore: summary.riskScore,
            criticalCount: summary.criticalCount,
            highCount: summary.highCount,
            mediumCount: summary.mediumCount,
            lowCount: summary.lowCount,
            finishedAt: Date.now()
        };

        const severity = (summary.criticalCount > 0 || summary.riskScore < 50) ? 'HIGH' : 'NORMAL';
        await this.persistNotification(workspaceId, NotificationEvents.SCAN_COMPLETED, 'SCAN_COMPLETED', severity, data);

        const payload = {
            room: `workspace:${workspaceId}`,
            event: NotificationEvents.SCAN_COMPLETED,
            data
        };
        await SocketPublisher.publish('oculus-notifications', payload);
    }

    static async publishScanFailed(workspaceId, repoId, repoName, scanId, errorMessage) {
        const data = { scanId, repoId, repoName, status: 'FAILED', error: errorMessage, timestamp: Date.now() };
        
        await this.persistNotification(workspaceId, NotificationEvents.SCAN_FAILED, 'GITHUB_ERROR', 'HIGH', data);

        const payload = {
            room: `workspace:${workspaceId}`,
            event: NotificationEvents.SCAN_FAILED,
            data
        };
        await SocketPublisher.publish('oculus-notifications', payload);
    }
}

export default NotificationService;
