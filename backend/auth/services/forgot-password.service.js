import crypto from 'node:crypto';
import { getPool } from '../../config/db.js';
import { hashToken } from '../../utils/jwt.js';
import { normalizeEmail } from '../../utils/loginLimiter.js';
import { findUserIdByEmail } from '../../repositories/user.repository.js';
import { createPasswordReset, deletePasswordResetsByUser } from '../../repositories/password-reset.repository.js';
import { sendEmail, forgotPasswordTemplate } from '../../email/index.js';
import config from '../../config/env.js';

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MINUTES = 60;

const buildResetToken = () => crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');

const deliverPasswordResetEmail = async ({ email, resetToken, userName }) => {
    const resetUrl = `${config.email.frontendUrl}/reset-password?token=${resetToken}`;
    const { html, text } = forgotPasswordTemplate({ resetUrl, userName });
    
    await sendEmail({
        to: email,
        subject: 'Reset your Oculus password',
        html,
        text
    });
};

export const forgotPassword = async (email) => {
    const normalizedEmail = normalizeEmail(email);
    const pool = getPool();
    const client = await pool.connect();
    const resetToken = buildResetToken();

    try {
        await client.query('BEGIN');

        const user = await findUserIdByEmail(client, normalizedEmail);
        const tokenHash = hashToken(resetToken);

        if (user?.id) {
            await deletePasswordResetsByUser(client, user.id);

            const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000).toISOString();
            await createPasswordReset(client, user.id, tokenHash, expiresAt);
        }

        await client.query('COMMIT');

        await deliverPasswordResetEmail({ 
            email: normalizedEmail, 
            resetToken,
            userName: user?.name || undefined
        });

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