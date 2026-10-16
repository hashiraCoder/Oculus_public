export const createPasswordReset = async (client, userId, tokenHash, expiresAt) => {
    const result = await client.query(
        `INSERT INTO password_resets (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, token_hash, expires_at, used_at, created_at`,
        [userId, tokenHash, expiresAt]
    );

    return result.rows[0] || null;
};

export const findActivePasswordResetByHash = async (client, tokenHash) => {
    const result = await client.query(
        `SELECT id, user_id, token_hash, expires_at, used_at, created_at
         FROM password_resets
         WHERE token_hash = $1
           AND used_at IS NULL
           AND expires_at > NOW()
         LIMIT 1`,
        [tokenHash]
    );

    return result.rows[0] || null;
};

export const markPasswordResetUsed = async (client, resetId) => {
    const result = await client.query(
        `UPDATE password_resets
         SET used_at = NOW()
         WHERE id = $1
           AND used_at IS NULL
         RETURNING id`,
        [resetId]
    );

    return result.rows[0] || null;
};

export const deletePasswordResetsByUser = async (client, userId) => {
    const result = await client.query(
        'DELETE FROM password_resets WHERE user_id = $1 RETURNING id',
        [userId]
    );

    return result.rows;
};

export const cleanupExpiredPasswordResets = async (client, cutoffInterval = '30 days') => {
    const result = await client.query(
        `DELETE FROM password_resets
         WHERE used_at IS NOT NULL
            OR expires_at < NOW() - ($1::interval)
         RETURNING id`,
        [cutoffInterval]
    );

    return result.rows;
};