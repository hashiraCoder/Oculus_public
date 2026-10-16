import { asynchandler } from '../utils/asyncHandler.js';
import ApiError from '../utils/apiError.js';
import { getPool } from '../config/db.js';
import logger from '../config/logger.js';

/**
 * Middleware that strictly verifies the current user has the 'SUPER_ADMIN' global_role.
 * Assumes verifyJwt has already run and attached req.user.
 * Also performs an audit log for all mutations (POST, PUT, PATCH, DELETE).
 */
export const requireSuperAdmin = asynchandler(async (req, res, next) => {
    if (!req.user || !req.user.sub) {
        throw new ApiError(401, 'Unauthorized request. No user session found.');
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
        const result = await client.query('SELECT global_role, email FROM users WHERE id = $1', [req.user.sub]);
        const user = result.rows[0];

        if (!user) {
            throw new ApiError(401, 'User no longer exists.');
        }

        if (user.global_role !== 'SUPER_ADMIN') {
            throw new ApiError(403, 'Forbidden. Engine Control Center requires SUPER_ADMIN privileges.');
        }
        
        // Attach user info to req for controller use
        req.adminEmail = user.email;

        // Perform audit logging for mutations
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            logger.info(`[SUPER_ADMIN_AUDIT] user:${user.email} method:${req.method} route:${req.originalUrl} ip:${req.ip}`);
        }

        return next();
    } finally {
        client.release();
    }
});
