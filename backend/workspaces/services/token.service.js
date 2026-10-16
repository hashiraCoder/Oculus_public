import crypto from 'node:crypto';
import { query } from '../../config/db.js';
import ApiError from '../../utils/apiError.js';

class TokenService {
    static async createToken(workspaceId, name, userId, scopes = [], expiresAt = null) {
        const publicId = crypto.randomBytes(8).toString('hex');
        const secret = crypto.randomBytes(16).toString('hex');
        const rawToken = `ocx_live_${publicId}_${secret}`;
        
        const tokenHash = crypto.createHash('sha256').update(secret).digest('hex');

        const res = await query(`INSERT INTO developer_tokens (workspace_id, name, token_prefix, token_hash, scopes, expires_at, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, token_prefix, scopes, expires_at, created_at`, [workspaceId, name, publicId, tokenHash, scopes, expiresAt, userId]);

        return {
            ...res.rows[0],
            token: rawToken
        };
    }

    static async listTokens(workspaceId) {
        const res = await query(`SELECT id, name, token_prefix, scopes, last_used_at, expires_at, revoked_at, created_at FROM developer_tokens WHERE workspace_id = $1 ORDER BY created_at DESC`, [workspaceId]);
        return res.rows;
    }

    static async revokeToken(workspaceId, tokenId, userId) {
        const res = await query(`
            UPDATE developer_tokens
            SET revoked_at = NOW(), revoked_by = $3
            WHERE id = $2 AND workspace_id = $1 AND revoked_at IS NULL
            RETURNING id
        `, [workspaceId, tokenId, userId]);

        if (res.rows.length === 0) {
            throw new ApiError(404, 'Token not found or already revoked');
        }
        return true;
    }

    static async rotateToken(workspaceId, tokenId, userId) {
        // Find existing token
        const res = await query(`
            SELECT name, scopes, expires_at
            FROM developer_tokens
            WHERE id = $1 AND workspace_id = $2 AND revoked_at IS NULL
        `, [tokenId, workspaceId]);

        if (res.rows.length === 0) {
            throw new ApiError(404, 'Token not found or already revoked');
        }

        const oldToken = res.rows[0];

        // Revoke old token
        await this.revokeToken(workspaceId, tokenId, userId);

        // Create new token with same parameters
        return this.createToken(workspaceId, oldToken.name, userId, oldToken.scopes, oldToken.expires_at);
    }
}

export default TokenService;
