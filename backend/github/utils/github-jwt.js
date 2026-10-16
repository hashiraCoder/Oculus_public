import jwt from 'jsonwebtoken';

export const buildGithubJwt = (appId, privateKey) => {
    const issuedAt = Math.floor(Date.now() / 1000) - 60; // 1 minute in the past
    const expiresAt = issuedAt + (10 * 60); // 10 minutes max expiration

    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    const token = jwt.sign(
        {
            iat: issuedAt,
            exp: expiresAt,
            iss: appId
        },
        formattedPrivateKey,
        { algorithm: 'RS256' }
    );

    return {
        token,
        expiresAt
    };
};