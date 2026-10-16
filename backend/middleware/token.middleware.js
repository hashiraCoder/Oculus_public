import crypto from 'node:crypto';
import { getPool } from '../config/db.js';
import ApiError from '../utils/apiError.js';
import { asynchandler } from '../utils/asyncHandler.js';

export const verifyDeveloperToken = asynchandler(async (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ocx_live_')) {
        return next(); // Fallthrough to next middleware (like verifyJwt) if not a dev token
    }

    const token = authHeader.replace('Bearer ', '');
    // token format: ocx_live_<16-char-public-id>_<32-char-secret>
    const parts = token.split('_');
    if (parts.length !== 4) {
        throw new ApiError(401, 'Invalid developer token format.');
    }

    const publicId = parts[2];
    const secret = parts[3];

    const pool = getPool();
    const result = await pool.query(`SELECT * FROM developer_tokens WHERE token_prefix = $1`, [publicId]);
    
    if (result.rows.length === 0) {
        throw new ApiError(401, 'Invalid developer token.');
    }

    const tokenRecord = result.rows[0];
    // Timing-safe comparison to prevent side-channel timing attacks
    const expectedHashBuffer = Buffer.from(tokenRecord.token_hash, 'utf8');
    const actualHashBuffer = Buffer.from(tokenHash, 'utf8');

    if (
        expectedHashBuffer.length !== actualHashBuffer.length ||
        !crypto.timingSafeEqual(expectedHashBuffer, actualHashBuffer)
    ) {
        throw new ApiError(401, 'Invalid developer token.');
    }

    if (tokenRecord.expires_at && new Date() > tokenRecord.expires_at) {
        throw new ApiError(401, 'Developer token has expired.');
    }

    if (tokenRecord.revoked_at) {
        throw new ApiError(401, 'Developer token has been revoked.');
    }

    // Mark token as used in background
    pool.query(`UPDATE developer_tokens SET last_used_at = NOW() WHERE id = $1`, [tokenRecord.id]).catch(() => {});

    // Set machine identity on request
    req.machineIdentity = {
        workspaceId: tokenRecord.workspace_id,
        tokenId: tokenRecord.id,
        tokenName: tokenRecord.name,
        scopes: tokenRecord.scopes || []
    };

    next();
});

