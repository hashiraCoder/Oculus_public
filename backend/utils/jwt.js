import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const buildAccessToken = (user, defaultWorkspaceId) => jwt.sign(
    {
        sub: user.id,
        userId: user.id,
        email: user.email,
        default_workspace_id: defaultWorkspaceId,
        tokenVersion: user.token_version
    },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpiresIn }
);

export const buildRefreshToken = (user, tokenVersion) => jwt.sign(
    {
        sub: user.id,
        userId: user.id,
        tokenVersion,
        jti: crypto.randomUUID(),
        type: 'refresh'
    },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
);

export const verifyRefreshToken = (token) => jwt.verify(token, config.jwt.refreshSecret);
