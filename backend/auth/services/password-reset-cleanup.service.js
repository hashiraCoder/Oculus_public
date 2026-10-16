import { getPool } from '../../config/db.js';
import { cleanupExpiredPasswordResets } from '../../repositories/password-reset.repository.js';

export const cleanupPasswordResets = async (cutoffInterval = '30 days') => {
    const pool = getPool();
    const client = await pool.connect();

    try {
        await cleanupExpiredPasswordResets(client, cutoffInterval);

        return { success: true };
    } finally {
        client.release();
    }
};