import redis from '../config/redis.js';
import ApiError from './apiError.js';

const LOGIN_LOCK_THRESHOLD = 5;
const LOGIN_LOCK_TTL_SECONDS = 15 * 60;

export const parseIpAddress = (requestIp) => {
    if (!requestIp) {
        return 'unknown';
    }

    return requestIp.replace(/^::ffff:/, '');
};

export const normalizeEmail = (email) => email.trim().toLowerCase();

const getLockoutKey = (email, ipAddress) => `auth:login:lock:${email}:${ipAddress}`;
const getFailureKey = (email, ipAddress) => `auth:login:failures:${email}:${ipAddress}`;

export const assertLoginNotLocked = async (email, ipAddress) => {
    const lockoutKey = getLockoutKey(email, ipAddress);
    const isLocked = await redis.get(lockoutKey);

    if (isLocked) {
        throw new ApiError(429, 'Too many failed login attempts. Try again later.');
    }
};

export const clearLoginCounters = async (email, ipAddress) => {
    await redis.del(getLockoutKey(email, ipAddress), getFailureKey(email, ipAddress));
};

export const registerFailedLogin = async (email, ipAddress) => {
    const failureKey = getFailureKey(email, ipAddress);
    const lockoutKey = getLockoutKey(email, ipAddress);
    const attempts = await redis.incr(failureKey);

    if (attempts === 1) {
        await redis.expire(failureKey, LOGIN_LOCK_TTL_SECONDS);
    }

    if (attempts >= LOGIN_LOCK_THRESHOLD) {
        await redis.set(lockoutKey, '1', 'EX', LOGIN_LOCK_TTL_SECONDS);
        await redis.del(failureKey);
        throw new ApiError(429, 'Too many failed login attempts. Try again later.');
    }
};
