import config from '../../config/env.js';
import redis from '../../config/redis.js';
import { buildGithubJwt } from '../utils/github-jwt.js';

export const buildGithubAppJwt = () => {
    return buildGithubJwt(config.github.appId, config.github.privateKey);
};

export const getInstallationAccessToken = async (installationId) => {
    const cacheKey = `github:installation:${installationId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
        const parsed = JSON.parse(cached);

        if (parsed.expiresAt > Date.now()) {
            return parsed.token;
        }
    }

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
        } else if ([401, 403].includes(status)) {
            error.isPermanent = true;
        }
        throw error;
    }

    const data = await response.json();
    const token = data.token;
    const expiresAt = new Date(data.expires_at).getTime();

    await redis.set(
        cacheKey,
        JSON.stringify({ token, expiresAt }),
        'EX',
        Math.max(60, Math.floor((expiresAt - Date.now()) / 1000))
    );

    return token;
};