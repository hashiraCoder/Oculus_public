import { getPool } from '../../config/db.js';
import { listUserWorkspaces, listWorkspaceMembers, getWorkspaceRiskPolicy, upsertWorkspaceRiskPolicy, updateWorkspaceName, deleteWorkspace } from '../../repositories/workspace.repository.js';
import ApiError from '../../utils/apiError.js';

const DEFAULT_RISK_WEIGHTS = { critical: 40, high: 20, medium: 5, low: 1 };

const normalizeRiskWeights = (input = {}) => ({
    critical: Number(input.critical ?? DEFAULT_RISK_WEIGHTS.critical),
    high: Number(input.high ?? DEFAULT_RISK_WEIGHTS.high),
    medium: Number(input.medium ?? DEFAULT_RISK_WEIGHTS.medium),
    low: Number(input.low ?? DEFAULT_RISK_WEIGHTS.low),
});

class WorkspaceService {
    static async getUserWorkspaces(userId) {
        const pool = getPool();
        const client = await pool.connect();
        try {
            const workspaces = await listUserWorkspaces(client, userId);
            return workspaces;
        } finally {
            client.release();
        }
    }

    static async getWorkspaceById(userId, workspaceId) {
        const pool = getPool();
        const client = await pool.connect();
        try {
            // Reusing listUserWorkspaces and filtering since it already joins roles
            const workspaces = await listUserWorkspaces(client, userId);
            const workspace = workspaces.find(w => w.id === workspaceId);
            if (!workspace) {
                throw new ApiError(403, 'Forbidden. You do not have access to this workspace.');
            }
            return workspace;
        } finally {
            client.release();
        }
    }
    static async getWorkspaceMembers(userId, workspaceId) {
        const pool = getPool();
        const client = await pool.connect();
        try {
            // Check access first
            const workspaces = await listUserWorkspaces(client, userId);
            const hasAccess = workspaces.some(w => w.id === workspaceId);
            if (!hasAccess) {
                throw new ApiError(403, 'Forbidden. You do not have access to this workspace.');
            }
            
            const members = await listWorkspaceMembers(client, workspaceId);
            return members;
        } finally {
            client.release();
        }
    }

    static async updateWorkspace(userId, workspaceId, name) {
        const pool = getPool();
        const client = await pool.connect();
        try {
            const role = await this.getRole(client, userId, workspaceId);
            if (role !== 'OWNER') throw new ApiError(403, 'Only workspace owners can update workspace settings.');
            const normalizedName = String(name || '').trim();
            if (!normalizedName) throw new ApiError(400, 'Workspace name is required.');
            return await updateWorkspaceName(client, workspaceId, normalizedName);
        } finally {
            client.release();
        }
    }

    static async removeWorkspace(userId, workspaceId) {
        const pool = getPool();
        const client = await pool.connect();
        try {
            const role = await this.getRole(client, userId, workspaceId);
            if (role !== 'OWNER') throw new ApiError(403, 'Only workspace owners can delete a workspace.');
            await deleteWorkspace(client, workspaceId);
        } finally {
            client.release();
        }
    }

    static async getRole(client, userId, workspaceId) {
        const result = await client.query(
            `SELECT role FROM users_workspaces WHERE user_id = $1 AND workspace_id = $2 LIMIT 1`,
            [userId, workspaceId]
        );
        return result.rows[0]?.role || null;
    }

    static async getRiskWeights(userId, workspaceId) {
        const pool = getPool();
        const client = await pool.connect();
        try {
            const workspaces = await listUserWorkspaces(client, userId);
            const hasAccess = workspaces.some(w => w.id === workspaceId);
            if (!hasAccess) {
                throw new ApiError(403, 'Forbidden. You do not have access to this workspace.');
            }

            const storedWeights = await getWorkspaceRiskPolicy(client, workspaceId, 'risk_weights');
            return { weights: storedWeights ? normalizeRiskWeights(storedWeights) : DEFAULT_RISK_WEIGHTS };
        } finally {
            client.release();
        }
    }

    static async upsertRiskWeights(userId, workspaceId, providedWeights) {
        const pool = getPool();
        const client = await pool.connect();
        try {
            const workspaces = await listUserWorkspaces(client, userId);
            const hasAccess = workspaces.some(w => w.id === workspaceId);
            if (!hasAccess) {
                throw new ApiError(403, 'Forbidden. You do not have access to this workspace.');
            }

            const normalized = normalizeRiskWeights(providedWeights);
            const policy = await upsertWorkspaceRiskPolicy(client, workspaceId, 'risk_weights', normalized);
            return { weights: normalizeRiskWeights(policy?.config || normalized) };
        } finally {
            client.release();
        }
    }
}

export default WorkspaceService;
