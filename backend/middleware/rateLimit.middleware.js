import redis from '../config/redis.js';
import config from '../config/env.js';
import ApiError from '../utils/apiError.js';
import { asynchandler } from '../utils/asyncHandler.js';

/**
 * Helper to execute fixed-window rate limiting in Redis
 */
const checkRateLimit = async (key, windowMs, max) => {
    const current = await redis.incr(key);
    if (current === 1) {
        await redis.pexpire(key, windowMs);
    }
    
    return {
        current,
        remaining: Math.max(0, max - current),
        resetTime: new Date(Date.now() + windowMs) // Approximation for headers
    };
};

/**
 * Middleware: Global API Token Rate Limiting
 * Limits requests per token ID.
 */
export const tokenRateLimiter = asynchandler(async (req, res, next) => {
    // Only apply to developer tokens
    if (!req.machineIdentity?.tokenId) {
        return next();
    }

    const { windowMs, max } = config.rateLimit.apiTokens;
    const key = `ratelimit:token:${req.machineIdentity.tokenId}`;

    const { current, remaining } = await checkRateLimit(key, windowMs, max);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (current > max) {
        throw new ApiError(429, 'Too many requests. API token rate limit exceeded.');
    }

    next();
});

/**
 * Middleware: Scan Creation Rate Limiting
 * Limits scans triggered per token ID.
 */
export const scanRateLimiter = asynchandler(async (req, res, next) => {
    // Only apply to developer tokens triggering scans
    if (!req.machineIdentity?.tokenId) {
        return next();
    }

    const { windowMs, max } = config.rateLimit.scans;
    const key = `ratelimit:scan:${req.machineIdentity.tokenId}`;

    const { current, remaining } = await checkRateLimit(key, windowMs, max);

    // Provide specific scan rate limit headers distinct from global api token limits
    res.setHeader('X-Scan-RateLimit-Limit', max);
    res.setHeader('X-Scan-RateLimit-Remaining', remaining);

    if (current > max) {
        throw new ApiError(429, 'Too many scan requests. Scan creation rate limit exceeded.');
    }

    next();
});
