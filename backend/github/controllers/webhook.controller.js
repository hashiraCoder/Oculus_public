import WebhookService from '../services/webhook.service.js';

class WebhookController {
    static async handleWebhook(req, res) {
        const event = req.header('X-GitHub-Event');
        const deliveryId = req.header('X-GitHub-Delivery');

        // We run the webhook handler asynchronously but wait for it 
        // to finish enqueueing so we don't drop it if the process dies.
        // The service does basic parsing, DB lookups, and enqueueing, 
        // which should take <100ms.
        try {
            await WebhookService.handleWebhook({
                event,
                deliveryId,
                payload: req.body // this is a buffer because of express.raw
            });
        } catch (error) {
            console.error(`[Webhook Error] Delivery: ${deliveryId}`, error);
            // Return 500 so GitHub retries if our DB or Redis is down
            return res.status(500).send('Internal Server Error');
        }

        // Always return 200 to GitHub if successfully enqueued or ignored
        res.status(200).send('OK');
    }
}

export default WebhookController;
