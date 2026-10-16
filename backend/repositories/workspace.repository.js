import { query } from '../config/db.js';

export const createWorkspace = async (client, name, type = 'PERSONAL', githubInstallationId = null) => {
    const result = await client.query(
        `INSERT INTO workspaces (name, type, github_installation_id)
         VALUES ($1, $2, $3)
         RETURNING id, name, type, github_installation_id, created_at`,
        [name, type, githubInstallationId]
    );

    return result.rows[0];
};

export const addUserWorkspace = async (client, userId, workspaceId, role = 'OWNER') => {
    await client.query(
        `INSERT INTO users_workspaces (user_id, workspace_id, role)
         VALUES ($1, $2, $3)`,
        [userId, workspaceId, role]
    );
};

export const listUserWorkspaces = async (client, userId) => {
    const result = await client.query(
        `SELECT
            w.id,
            w.name,
            uw.role,
            uw.joined_at,
            (w.github_installation_id IS NOT NULL) as "hasGithubConnection",
            w.github_account_login as "githubAccountLogin",
            w.github_sync_status as "githubSyncStatus"
         FROM users_workspaces uw
         INNER JOIN workspaces w ON w.id = uw.workspace_id
         WHERE uw.user_id = $1
         ORDER BY CASE WHEN uw.role = 'OWNER' THEN 0 ELSE 1 END, uw.joined_at ASC, w.created_at ASC`,
        [userId]
    );

    return result.rows;
};

export const findUserWorkspaceRole = async (userId, workspaceId) => {
    const result = await query(
        `SELECT role
         FROM users_workspaces
         WHERE user_id = $1
           AND workspace_id = $2
         LIMIT 1`,
        [userId, workspaceId]
    );

    return result.rows[0]?.role || null;
};

export const upsertWorkspaceGithubConnection = async ({ workspaceId, installationId, accountLogin = null, accountType = null }) => {
    const result = await query(
        `UPDATE workspaces
         SET github_installation_id = $2,
             github_connected_at = NOW(),
             github_account_login = $3,
             github_account_type = $4,
             github_sync_status = 'PENDING',
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, github_installation_id, github_connected_at`,
        [workspaceId, installationId, accountLogin, accountType]
    );

    return result.rows[0] || null;
};

export const disconnectWorkspaceGithubConnection = async ({ workspaceId }) => {
    const result = await query(
        `UPDATE workspaces
         SET github_installation_id = NULL,
             github_connected_at = NULL,
             github_account_login = NULL,
             github_account_type = NULL,
             github_sync_status = NULL,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id`,
        [workspaceId]
    );

    return result.rows[0] || null;
};

export const updateWorkspaceSyncStatus = async (workspaceId, status) => {
    const result = await query(
        `UPDATE workspaces
         SET github_sync_status = $2,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, github_sync_status`,
        [workspaceId, status]
    );
    return result.rows[0] || null;
};

export const findByGithubInstallationId = async (installationId) => {
    const result = await query(
        `SELECT id, name, type, github_account_login FROM workspaces WHERE github_installation_id = $1`,
        [installationId]
    );
    return result.rows[0] || null;
};

export const findWorkspaceById = async (workspaceId) => {
    const result = await query(
        `SELECT id, name, type, github_installation_id, github_account_login, github_account_type, github_sync_status 
         FROM workspaces 
         WHERE id = $1`,
        [workspaceId]
    );
    return result.rows[0] || null;
};

export const updateWorkspaceName = async (client, workspaceId, name) => {
    const result = await client.query(
        `UPDATE workspaces SET name = $2, updated_at = NOW()
         WHERE id = $1 RETURNING id, name, type`,
        [workspaceId, name]
    );
    return result.rows[0] || null;
};

export const deleteWorkspace = async (client, workspaceId) => {
    await client.query('DELETE FROM workspaces WHERE id = $1', [workspaceId]);
};

export const listWorkspaceMembers = async (client, workspaceId) => {
    const result = await client.query(
        `SELECT 
            u.id, 
            u.email, 
            u.email AS name,
            uw.role, 
            uw.joined_at
         FROM users_workspaces uw
         INNER JOIN users u ON u.id = uw.user_id
         WHERE uw.workspace_id = $1
         ORDER BY CASE WHEN uw.role = 'OWNER' THEN 0 ELSE 1 END, uw.joined_at ASC`,
        [workspaceId]
    );
    return result.rows;
};

export const getWorkspaceRiskPolicy = async (client, workspaceId, policyType = 'risk_weights') => {
    const result = await client.query(
        `SELECT config
         FROM risk_policies
         WHERE workspace_id = $1 AND policy_type = $2
         LIMIT 1`,
        [workspaceId, policyType]
    );

    return result.rows[0]?.config || null;
};

export const upsertWorkspaceRiskPolicy = async (client, workspaceId, policyType, config) => {
    const result = await client.query(
        `INSERT INTO risk_policies (workspace_id, policy_type, config)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (workspace_id, policy_type)
         DO UPDATE SET config = EXCLUDED.config,
                       updated_at = NOW()
         RETURNING workspace_id, policy_type, config, updated_at`,
        [workspaceId, policyType, JSON.stringify(config)]
    );

    return result.rows[0] || null;
};
