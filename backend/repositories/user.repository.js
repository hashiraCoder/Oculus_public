export const findUserIdByEmail = async (client, email) => {
    const result = await client.query(
        'SELECT id FROM users WHERE email = $1 LIMIT 1',
        [email]
    );

    return result.rows[0] || null;
};

export const findAuthUserByEmail = async (client, email) => {
    const result = await client.query(
        `SELECT id, email, password_hash, global_role, is_verified, token_version
         FROM users
         WHERE email = $1
         LIMIT 1`,
        [email]
    );

    return result.rows[0] || null;
};

export const createUser = async (client, email, passwordHash) => {
    const result = await client.query(
        `INSERT INTO users (email, password_hash)
         VALUES ($1, $2)
         RETURNING id, email, global_role, is_verified, created_at`,
        [email, passwordHash]
    );

    return result.rows[0];
};

export const touchLastLogin = async (client, userId) => {
    await client.query(
        'UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1',
        [userId]
    );
};

export const findUserTokenVersionById = async (client, userId) => {
    const result = await client.query(
        'SELECT id, token_version FROM users WHERE id = $1 LIMIT 1',
        [userId]
    );

    return result.rows[0] || null;
};

export const incrementUserTokenVersion = async (client, userId) => {
    const result = await client.query(
        `UPDATE users
         SET token_version = token_version + 1,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, token_version`,
        [userId]
    );

    return result.rows[0] || null;
};

export const updatePasswordHash = async (client, userId, passwordHash) => {
    const result = await client.query(
        `UPDATE users
         SET password_hash = $2,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id`,
        [userId, passwordHash]
    );

    return result.rows[0] || null;
};
