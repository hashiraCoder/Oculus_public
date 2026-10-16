import config from '../../config/env.js';
import redis from '../../config/redis.js';
import { buildGithubJwt } from '../utils/github-jwt.js';
import logger from '../../config/logger.js';

export const buildGithubAppJwt = () => {
    return buildGithubJwt(config.github.appId, config.github.privateKey);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class GithubTokenService {
    static async getInstallationAccessToken(installationId) {
        const cacheKey = `github:installation:${installationId}:token`;
        const lockKey = `${cacheKey}-lock`;

        while (true) {
            // 1. Try Cache
            const cached = await redis.get(cacheKey);
            if (cached) {
                logger.info(`[GithubTokenService] Cache hit for installation ${installationId}`);
                return cached;
            }

            // 2. Attempt Lock
            const lockAcquired = await redis.set(lockKey, 'locked', 'NX', 'EX', 30);
            
            if (lockAcquired) {
                try {
                    logger.info(`[GithubTokenService] Acquired lock, generating token for ${installationId}`);
                    const { token: appToken } = buildGithubAppJwt();
                    
                    const response = await fetch(`${config.github.apiBaseUrl}/app/installations/${installationId}/access_tokens`, {
                        method: 'POST',
                        headers: {
                            Accept: 'application/vnd.github+json',
                            Authorization: `Bearer ${appToken}`,
                            'X-GitHub-Api-Version': '2022-11-28',
                        },
                    });

                    if (!response.ok) {
                        const status = response.status;
                        let error = new Error(`Failed to create installation token (${status}).`);
                        error.status = status;

                        if ([429, 502, 503, 504].includes(status)) {
                            error.isRetryable = true;
                        } else if ([401, 403, 404].includes(status)) {
                            error.isPermanent = true;
                        }
                        throw error;
                    }

                    const data = await response.json();
                    const token = data.token;
                    
                    // TTL 55 minutes (3300 seconds)
                    await redis.set(cacheKey, token, 'EX', 3300);
                    logger.info(`[GithubTokenService] Token cached for ${installationId}`);
                    return token;
                } catch (error) {
                    logger.error(`[GithubTokenService] Error generating token for ${installationId}`, error);
                    throw error;
                } finally {
                    // Always release lock
                    await redis.del(lockKey);
                    logger.info(`[GithubTokenService] Released lock for ${installationId}`);
                }
            } else {
                // 3. Lock not acquired, wait with Jitter
                const jitterMs = Math.floor(Math.random() * 200) + 300; // 300-500ms
                logger.info(`[GithubTokenService] Lock held by another instance. Waiting ${jitterMs}ms for ${installationId}`);
                await sleep(jitterMs);
            }
        }
    }
}

export default GithubTokenService;
