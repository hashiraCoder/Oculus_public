import { query } from '../../config/db.js';

class GithubWebhookRepository {
    static async createEvent({ deliveryId, eventType, action = null, installationId = null, repositoryId = null }) {
        const result = await query(
            `INSERT INTO github_webhook_events (
                delivery_id,
                event_type,
                action,
                installation_id,
                repository_id,
                status
             ) VALUES ($1, $2, $3, $4, $5, 'RECEIVED')
             ON CONFLICT (delivery_id) DO NOTHING
             RETURNING id, delivery_id, status`,
            [deliveryId, eventType, action, installationId, repositoryId]
        );

        return result.rows[0] || null; // Returns null if delivery_id already exists
    }

    static async markEventProcessed(deliveryId) {
        await query(
            `UPDATE github_webhook_events
             SET status = 'PROCESSED',
                 processed_at = NOW()
             WHERE delivery_id = $1`,
            [deliveryId]
        );
    }
    
    static async markEventFailed(deliveryId) {
        await query(
            `UPDATE github_webhook_events
             SET status = 'FAILED',
                 processed_at = NOW()
             WHERE delivery_id = $1`,
            [deliveryId]
        );
    }
}

export default GithubWebhookRepository;
