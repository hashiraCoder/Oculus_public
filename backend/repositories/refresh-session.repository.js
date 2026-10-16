export const findActiveRefreshSessionWithUserByHash = async (client, tokenHash) => {
    const result = await client.query(
        `SELECT
            rs.id AS session_id,
            rs.user_id,
            u.id,
            u.email,
            u.global_role,
            u.is_verified,
            u.token_version AS current_token_version
         FROM refresh_sessions rs
         INNER JOIN users u ON u.id = rs.user_id
         WHERE rs.token_hash = $1
           AND rs.revoked_at IS NULL
           AND rs.expires_at > NOW()
         LIMIT 1`,
        [tokenHash]
    );

    return result.rows[0] || null;
};

export const createRefreshSession = async (client, userId, tokenHash, expiresIn) => {
    const result = await client.query(
        `INSERT INTO refresh_sessions (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + ($3::interval))
         RETURNING id`,
        [userId, tokenHash, expiresIn]
    );

    return result.rows[0] || null;
};

export const touchRefreshSessionLastUsedAtById = async (client, sessionId) => {
    const result = await client.query(
        `UPDATE refresh_sessions
         SET last_used_at = NOW()
         WHERE id = $1`,
        [sessionId]
    );

    return result.rowCount;
};

export const revokeRefreshSessionById = async (client, sessionId) => {
    const result = await client.query(
        `UPDATE refresh_sessions
         SET revoked_at = NOW()
         WHERE id = $1
           AND revoked_at IS NULL
         RETURNING id`,
        [sessionId]
    );

    return result.rows[0] || null;
};

export const revokeAllRefreshSessionsByUserId = async (client, userId) => {
    const result = await client.query(
        `UPDATE refresh_sessions
         SET revoked_at = NOW()
         WHERE user_id = $1
           AND revoked_at IS NULL
         RETURNING id`,
        [userId]
    );

    return result.rows;
};

export const deleteExpiredRefreshSessions = async (client, cutoffInterval = '30 days') => {
    const result = await client.query(
        `DELETE FROM refresh_sessions
         WHERE expires_at < NOW() - ($1::interval)
         RETURNING id`,
        [cutoffInterval]
    );

    return result.rows;
};