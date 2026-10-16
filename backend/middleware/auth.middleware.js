import jwt from 'jsonwebtoken';
import { asynchandler } from '../utils/asyncHandler.js';
import config from '../config/env.js';
import ApiError from '../utils/apiError.js';
import { getPool } from '../config/db.js';
import { findUserTokenVersionById } from '../repositories/user.repository.js';

export const verifyJwt = asynchandler(async (req, res, next) => {
    const token = req.cookies?.jwt_token || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        throw new ApiError(401, 'Unauthorized request');
    }
    
    try {
        req.user = jwt.verify(token, config.jwt.secret);
    } catch (error) {
        throw new ApiError(401, 'Invalid access token');
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
        const currentUser = await findUserTokenVersionById(client, req.user.sub);

        if (!currentUser || currentUser.token_version !== req.user.tokenVersion) {
            throw new ApiError(401, 'Session revoked. Please log in again.');
        }

        return next();
    } finally {
        client.release();
    }
})