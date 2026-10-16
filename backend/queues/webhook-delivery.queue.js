import { Queue } from 'bullmq';

const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const webhookDeliveryQueue = new Queue('webhook-delivery', { 
    connection,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 5000
        }
    }
});

