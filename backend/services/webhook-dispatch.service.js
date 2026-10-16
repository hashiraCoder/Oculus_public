import { query } from '../config/db.js';
import { webhookDeliveryQueue } from '../queues/webhook-delivery.queue.js';

class WebhookDispatchService {
    static async handleEvent({ scanId, eventType, payload }) {
        const webhookEvent = eventType.replace('_', '.');
        const workspaceId = payload.workspaceId;
        if (!workspaceId) return;

        const res = await query('SELECT id FROM integration_webhooks WHERE workspace_id = $1 AND is_active = true AND $2 = ANY(events)', [workspaceId, webhookEvent]);

        const webhooks = res.rows;

        for (const webhook of webhooks) {
            await webhookDeliveryQueue.add('deliver', {
                webhookId: webhook.id,
                eventType: webhookEvent,
                payload
            }, {
                jobId: `${webhook.id}-${scanId}-${eventType}`
            });
        }
    }
}


export default WebhookDispatchService;
