import { getPool } from '../../config/db.js';
import ApiError from '../../utils/apiError.js';
import { hashToken, verifyRefreshToken } from '../../utils/jwt.js';
import {
    findActiveRefreshSessionWithUserByHash,
    revokeRefreshSessionById
} from '../../repositories/refresh-session.repository.js';
import { rotateRefreshSession } from './session.service.js';
import logger from '../../config/logger.js';

export const refreshSession = async (refreshToken) => {
    if (!refreshToken) {
        logger.info('[AUTH_REFRESH] cookiePresent=false result=401 reason=missing_refresh_cookie');
        throw new ApiError(401, 'Refresh token is required.');
    }

    logger.info('[AUTH_REFRESH] cookiePresent=true');

    const pool = getPool();
    const client = await pool.connect();
    const tokenHash = hashToken(refreshToken);

    try {
        let decoded;
        try {
            decoded = verifyRefreshToken(refreshToken);
            logger.info(`[AUTH_REFRESH] jwtValid=true sub=${decoded.sub} type=${decoded.type}`);
        } catch (jwtError) {
            logger.info(`[AUTH_REFRESH] jwtValid=false reason=${jwtError.message}`);
            throw new ApiError(401, 'Invalid or expired refresh token.');
        }

        await client.query('BEGIN');

        const session = await findActiveRefreshSessionWithUserByHash(client, tokenHash);

        if (!session) {
            logger.info('[AUTH_REFRESH] sessionFound=false result=401 reason=no_active_session_for_hash');
            await client.query('ROLLBACK');
            throw new ApiError(401, 'Invalid refresh token.');
        }

        if (session.user_id !== decoded.sub) {
            logger.info(`[AUTH_REFRESH] sessionFound=true userMatch=false sessionUserId=${session.user_id} tokenSub=${decoded.sub}`);
            await revokeRefreshSessionById(client, session.session_id);
            await client.query('COMMIT');
            throw new ApiError(401, 'Invalid refresh token.');
        }

        if (session.current_token_version !== decoded.tokenVersion) {
            logger.info(`[AUTH_REFRESH] sessionFound=true tokenVersionValid=false sessionVersion=${session.current_token_version} tokenVersion=${decoded.tokenVersion}`);
            await revokeRefreshSessionById(client, session.session_id);
            await client.query('COMMIT');
            throw new ApiError(401, 'Invalid refresh token.');
        }

        logger.info(`[AUTH_REFRESH] sessionFound=true userMatch=true tokenVersionValid=true`);

        const user = {
            id: session.id,
            email: session.email,
            global_role: session.global_role,
            is_verified: session.is_verified,
            token_version: session.current_token_version
        };

        const rotatedSession = await rotateRefreshSession(client, user, session.session_id);

        await client.query('COMMIT');

        logger.info(`[AUTH_REFRESH] rotation=success result=200`);

        return {
            isDuplicate: false,
            ...rotatedSession
        };
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // Ignore cleanup failures after a committed transaction.
        }
        if (!error.statusCode) {
            logger.error(`[AUTH_REFRESH] rotation=failed reason=internal_error message=${error.message}`);
        }
        throw error;
    } finally {
        client.release();
    }
};
