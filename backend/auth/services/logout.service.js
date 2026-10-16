import { getPool } from '../../config/db.js';
import { hashToken } from '../../utils/jwt.js';
import {
    deleteExpiredRefreshSessions,
    findActiveRefreshSessionWithUserByHash,
    revokeAllRefreshSessionsByUserId,
    revokeRefreshSessionById
} from '../../repositories/refresh-session.repository.js';
import { incrementUserTokenVersion } from '../../repositories/user.repository.js';

export const logoutSession = async (refreshToken) => {
    const pool = getPool();
    const client = await pool.connect();

    try {
        if (!refreshToken) {
            return { success: true };
        }

        const tokenHash = hashToken(refreshToken);
        const session = await findActiveRefreshSessionWithUserByHash(client, tokenHash);

        if (!session) {
            return { success: true };
        }

        await revokeRefreshSessionById(client, session.session_id);

        return { success: true };
    } finally {
        client.release();
    }
};

export const logoutAllSessions = async (userId) => {
    if (!userId) {
        return { success: true };
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const updatedUser = await incrementUserTokenVersion(client, userId);

        if (!updatedUser) {
            await client.query('ROLLBACK');
            return { success: true };
        }

        await revokeAllRefreshSessionsByUserId(client, userId);

        await client.query('COMMIT');

        return { success: true };
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // Ignore cleanup failures after a committed transaction.
        }

        throw error;
    } finally {
        client.release();
    }
};

export const cleanupExpiredSessions = async (cutoffInterval = '30 days') => {
    const pool = getPool();
    const client = await pool.connect();

    try {
        await deleteExpiredRefreshSessions(client, cutoffInterval);

        return { success: true };
    } finally {
        client.release();
    }
};
