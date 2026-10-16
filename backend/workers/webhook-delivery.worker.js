import { Worker } from 'bullmq';
import crypto from 'node:crypto';
import { getPool, query } from '../config/db.js';
import { isSafeUrl } from '../utils/ssrf.js';
import axios from 'axios';

const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

const processWebhookDelivery = async (job) => {
    const { webhookId, eventType, payload } = job.data;

    // Fetch webhook details
    const webhookRes = await query(`SELECT url, secret FROM integration_webhooks WHERE id = $1 AND is_active = true`, [webhookId]);
    if (webhookRes.rows.length === 0) {
        return; // Webhook deleted or deactivated
    }
    
    const { url, secret } = webhookRes.rows[0];

    // SSRF Check
    const safe = await isSafeUrl(url);
    if (!safe) {
        await logDelivery(webhookId, eventType, payload, 'FAILED', null, 'SSRF blocked: Unsafe URL');
        throw new Error('Unsafe URL');
    }

    // Prepare request
    const bodyString = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret).update(bodyString).digest('hex');

    try {
        const response = await axios.post(url, bodyString, {
            headers: {
                'Content-Type': 'application/json',
                'X-Oculus-Signature-256': signature,
                'X-Oculus-Event': eventType
            },
            timeout: 10000 // 10s timeout
        });

        await logDelivery(webhookId, eventType, payload, 'DELIVERED', response.status, JSON.stringify(response.data).slice(0, 1000));
    } catch (error) {
        const statusCode = error.response?.status || null;
        const responseBody = error.response?.data ? JSON.stringify(error.response.data).slice(0, 1000) : error.message;
        
        await logDelivery(webhookId, eventType, payload, 'FAILED', statusCode, responseBody);
        throw error; // Let BullMQ retry
    }
};

const logDelivery = async (webhookId, eventType, payload, status, statusCode, responseBody) => {
    try {
        await query(`INSERT INTO webhook_deliveries (webhook_id, event_type, status, status_code, payload, response_body) VALUES ($1, $2, $3, $4, $5, $6)`, 
        [webhookId, eventType, status, statusCode, payload, responseBody]);
    } catch (err) {
        console.error('Failed to log webhook delivery', err);
    }
};

export const webhookDeliveryWorker = new Worker('webhook-delivery', processWebhookDelivery, { connection });

webhookDeliveryWorker.on('failed', (job, err) => {
    console.error(`Webhook delivery ${job?.id} failed: ${err.message}`);
});
