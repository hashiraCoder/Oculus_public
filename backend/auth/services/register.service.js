import { getPool } from '../../config/db.js';
import { hashPassword } from '../../utils/password.js';
import { findUserIdByEmail, createUser } from '../../repositories/user.repository.js';
import { createWorkspace, addUserWorkspace } from '../../repositories/workspace.repository.js';
import { issueSession } from './session.service.js';
import { normalizeEmail } from '../../utils/loginLimiter.js';

export const registerUser = async (email, password, name) => {
    const normalizedEmail = normalizeEmail(email);
    const workspaceName = `${name.trim()}'s Workspace`;
    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const existingUser = await findUserIdByEmail(client, normalizedEmail);

        if (existingUser) {
            await client.query('ROLLBACK');
            return { isDuplicate: true };
        }

        const passwordHash = await hashPassword(password);
        const user = await createUser(client, normalizedEmail, passwordHash);
        const workspace = await createWorkspace(client, workspaceName, 'PERSONAL', null);

        await addUserWorkspace(client, user.id, workspace.id, 'OWNER');

        const hydratedUser = {
            ...user,
            token_version: 0
        };

        const session = await issueSession(client, hydratedUser);

        await client.query('COMMIT');

        return {
            isDuplicate: false,
            ...session
        };
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // Ignore cleanup failures after a committed transaction.
        }

        if (error?.code === '23505') {
            return { isDuplicate: true };
        }

        throw error;
    } finally {
        client.release();
    }
};
