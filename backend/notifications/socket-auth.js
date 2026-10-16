import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { getPool } from '../config/db.js';
import { findUserTokenVersionById } from '../repositories/user.repository.js';
import logger from '../config/logger.js';

export const socketAuthMiddleware = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return next(new Error('Unauthorized request'));
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        
        const pool = getPool();
        const client = await pool.connect();

        try {
            const currentUser = await findUserTokenVersionById(client, decoded.sub);
            if (!currentUser || currentUser.token_version !== decoded.tokenVersion) {
                return next(new Error('Session revoked. Please log in again.'));
            }

            // Bind user info to socket
            socket.user = decoded;
            next();
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('[Socket Auth] Authentication failed', error);
        next(new Error('Invalid access token'));
    }
};

// Check if user has access to workspace before allowing them to join the room
export const requireWorkspaceAccess = async (socket, workspaceId) => {
    const pool = getPool();
    const result = await pool.query(
        'SELECT 1 FROM users_workspaces WHERE user_id = $1 AND workspace_id = $2',
        [socket.user.sub, workspaceId]
    );

    if (result.rows.length === 0) {
        throw new Error('Forbidden: No access to workspace');
    }
};
