import { query } from '../../config/db.js';
import ApiError from '../../utils/apiError.js';
import { asynchandler } from '../../utils/asyncHandler.js';
import crypto from 'node:crypto';

class WebhookController {
    static createWebhook = asynchandler(async (req, res) => {
        const workspaceId = req.params.id;
        const { name, url, events } = req.body;
        if (!name || !url || !events || !Array.isArray(events)) {
            throw new ApiError(400, 'Name, URL, and events array are required');
        }
        // generate random secret
        const secret = crypto.randomBytes(32).toString('hex');
        
        const result = await query(`INSERT INTO integration_webhooks (workspace_id, name, url, secret, events) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, url, secret, events, is_active, created_at`, [workspaceId, name, url, secret, events]);
        res.status(201).json(result.rows[0]);
    });

    static listWebhooks = asynchandler(async (req, res) => {
        const workspaceId = req.params.id;
        const result = await query(`SELECT id, name, url, events, is_active, created_at FROM integration_webhooks WHERE workspace_id = $1 ORDER BY created_at DESC`, [workspaceId]);
        res.status(200).json(result.rows);
    });

    static deleteWebhook = asynchandler(async (req, res) => {
        const { id: workspaceId, webhookId } = req.params;
        const result = await query(`DELETE FROM integration_webhooks WHERE id = $1 AND workspace_id = $2 RETURNING id`, [webhookId, workspaceId]);
        if (result.rowCount === 0) throw new ApiError(404, 'Webhook not found');
        res.status(204).send();
    });

    static toggleWebhook = asynchandler(async (req, res) => {
        const { id: workspaceId, webhookId } = req.params;
        const { is_active } = req.body;
        const result = await query(`UPDATE integration_webhooks SET is_active = $1, updated_at = NOW() WHERE id = $2 AND workspace_id = $3 RETURNING id, is_active`, [is_active, webhookId, workspaceId]);
        if (result.rowCount === 0) throw new ApiError(404, 'Webhook not found');
        res.status(200).json(result.rows[0]);
    });
}

export default WebhookController;

