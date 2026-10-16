import { getPool } from '../../config/db.js';
import ApiError from '../../utils/apiError.js';
import { DUMMY_PASSWORD_HASH, verifyPassword } from '../../utils/password.js';
import {
    assertLoginNotLocked,
    clearLoginCounters,
    normalizeEmail,
    parseIpAddress,
    registerFailedLogin
} from '../../utils/loginLimiter.js';
import { findAuthUserByEmail, touchLastLogin } from '../../repositories/user.repository.js';
import { issueSession } from './session.service.js';

export const loginUser = async (email, password, requestIp) => {
    const normalizedEmail = normalizeEmail(email);
    const ipAddress = parseIpAddress(requestIp);
    const pool = getPool();
    const client = await pool.connect();

    try {
        await assertLoginNotLocked(normalizedEmail, ipAddress);

        await client.query('BEGIN');

        const user = await findAuthUserByEmail(client, normalizedEmail);
        const passwordMatches = user
            ? await verifyPassword(password, user.password_hash)
            : await verifyPassword(password, DUMMY_PASSWORD_HASH);

        if (!user || !passwordMatches) {
            await client.query('ROLLBACK');
            await registerFailedLogin(normalizedEmail, ipAddress);
            throw new ApiError(401, 'Invalid email or password.');
        }

        await clearLoginCounters(normalizedEmail, ipAddress);
        await touchLastLogin(client, user.id);

        const session = await issueSession(client, user);

        await client.query('COMMIT');

        return {
            isDuplicate: false,
            ...session
        };
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
