import crypto from 'node:crypto';
import ApiError from '../../utils/apiError.js';
import { getPool } from '../../config/db.js';
import { hashPassword } from '../../utils/password.js';
import { hashToken } from '../../utils/jwt.js';
import { findActivePasswordResetByHash, markPasswordResetUsed } from '../../repositories/password-reset.repository.js';
import { revokeAllRefreshSessionsByUserId } from '../../repositories/refresh-session.repository.js';
import { incrementUserTokenVersion, updatePasswordHash } from '../../repositories/user.repository.js';

const hashResetToken = (token) => hashToken(token);

export const resetPassword = async (token, password) => {
    const pool = getPool();
    const client = await pool.connect();
    const tokenHash = hashResetToken(token);

    try {
        await client.query('BEGIN');

        const resetRecord = await findActivePasswordResetByHash(client, tokenHash);

        if (!resetRecord) {
            await client.query('ROLLBACK');
            throw new ApiError(401, 'Invalid or expired password reset token.');
        }

        const passwordHash = await hashPassword(password, crypto.randomBytes(16).toString('hex'));

        const updatedUser = await updatePasswordHash(client, resetRecord.user_id, passwordHash);

        if (!updatedUser) {
            await client.query('ROLLBACK');
            throw new ApiError(404, 'User not found.');
        }

        const versionUpdatedUser = await incrementUserTokenVersion(client, resetRecord.user_id);

        if (!versionUpdatedUser) {
            await client.query('ROLLBACK');
            throw new ApiError(404, 'User not found.');
        }

        await revokeAllRefreshSessionsByUserId(client, resetRecord.user_id);
        await markPasswordResetUsed(client, resetRecord.id);

        await client.query('COMMIT');

        return { success: true };
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // Ignore rollback cleanup failures.
        }

        throw error;
    } finally {
        client.release();
    }
};