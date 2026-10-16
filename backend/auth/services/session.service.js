import config from '../../config/env.js';
import { buildAccessToken, buildRefreshToken, hashToken } from '../../utils/jwt.js';
import { listUserWorkspaces } from '../../repositories/workspace.repository.js';
import {
    createRefreshSession,
    revokeRefreshSessionById,
    touchRefreshSessionLastUsedAtById
} from '../../repositories/refresh-session.repository.js';

const hydrateUserWorkspaces = async (client, userId) => {
    const workspaceRows = await listUserWorkspaces(client, userId);

    const workspaces = workspaceRows.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        role: workspace.role
    }));

    return {
        workspaces,
        defaultWorkspaceId: workspaces[0]?.id || null
    };
};

export const issueSession = async (client, user) => {
    const { workspaces, defaultWorkspaceId } = await hydrateUserWorkspaces(client, user.id);
    const accessToken = buildAccessToken(user, defaultWorkspaceId);
    const refreshToken = buildRefreshToken(user, user.token_version);
    const refreshTokenHash = hashToken(refreshToken);

    await createRefreshSession(client, user.id, refreshTokenHash, config.jwt.refreshExpiresIn);

    return {
        user: {
            id: user.id,
            email: user.email,
            name: user.email.split('@')[0],
            initials: user.email.substring(0, 2).toUpperCase(),
            role: user.global_role || 'USER',
            isVerified: user.is_verified,
            lastLoginFormatted: new Date().toISOString()
        },
        workspaces,
        accessToken,
        refreshToken
    };
};

export const rotateRefreshSession = async (client, user, currentSessionId) => {
    const { workspaces, defaultWorkspaceId } = await hydrateUserWorkspaces(client, user.id);

    await touchRefreshSessionLastUsedAtById(client, currentSessionId);
    await revokeRefreshSessionById(client, currentSessionId);

    const accessToken = buildAccessToken(user, defaultWorkspaceId);
    const nextRefreshToken = buildRefreshToken(user, user.token_version);
    const nextRefreshTokenHash = hashToken(nextRefreshToken);

    await createRefreshSession(client, user.id, nextRefreshTokenHash, config.jwt.refreshExpiresIn);

    return {
        user: {
            id: user.id,
            email: user.email,
            name: user.email.split('@')[0],
            initials: user.email.substring(0, 2).toUpperCase(),
            role: user.global_role || 'USER',
            isVerified: user.is_verified,
            lastLoginFormatted: new Date().toISOString()
        },
        workspaces,
        accessToken,
        refreshToken: nextRefreshToken
    };
};
