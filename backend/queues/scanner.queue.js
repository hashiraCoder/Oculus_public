import { Queue } from 'bullmq';
import redis from '../config/redis.js';

const commonQueueOptions = {
    connection: redis,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 1000
        },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 86400, count: 1000 }
    }
};

export const scannerQueue = new Queue('scanner', commonQueueOptions);

// BullMQ requires the queue to be initialized with a priority range
// to store jobs in a sorted set keyed by priority.
// We set 10 priority levels (1 = lowest background, 10 = critical P0).
// This is a queue-level setting that cannot be changed after jobs exist.
scannerQueue.setMaxListeners(20);

scannerQueue.on('error', (err) => {
    console.error(`[Scanner Queue] Error:`, err.message);
});
