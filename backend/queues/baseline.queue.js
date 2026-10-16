import { Queue } from 'bullmq';
import redis from '../config/redis.js';

export const baselineQueue = new Queue('baseline-scan', { 
    connection: redis 
});
