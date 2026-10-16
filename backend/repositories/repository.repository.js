import { buildCursorPagination, normalizeCursorLimit } from '../pagination/index.js';
import { query } from '../config/db.js';

class RepositoryRepository {
    static async listByWorkspace({ workspaceId, cursor = null, limit = 50 }) {
        const normalizedLimit = normalizeCursorLimit(limit);
        const params = [workspaceId];
        const whereClauses = ['workspace_id = $1'];

        if (cursor?.created_at !== undefined && cursor?.id !== undefined) {
            whereClauses.push('(created_at < $2 OR (created_at = $2 AND id < $3))');
            params.push(cursor.created_at, cursor.id);
        } else if (cursor?.created_at !== undefined) {
            whereClauses.push('created_at < $2');
            params.push(cursor.created_at);
        }

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const result = await query(`
            SELECT 
                id, 
                workspace_id, 
                github_repo_id, 
                github_node_id,
                name, 
                full_name, 
                owner, 
                installation_id,
                is_private, 
                default_branch, 
                is_scanning_enabled,
                current_risk_score, 
                current_risk_grade, 
                current_risk_level, 
                last_synced_at, 
                created_at,
                updated_at,
                ('https://github.com/' || full_name) AS url,
                                (SELECT MAX(started_at) FROM scans WHERE repository_id = repositories.id) AS last_scan_date,
                                (SELECT COUNT(*) FROM vulnerabilities v
                                 JOIN scans s ON s.id = v.scan_id
                                 WHERE s.repository_id = repositories.id
                                     AND v.status IN ('OPEN', 'CONFIRMED'))::int AS total_findings,
                                (SELECT COUNT(*) FROM vulnerabilities v
                                 JOIN scans s ON s.id = v.scan_id
                                 WHERE s.repository_id = repositories.id
                                     AND v.status IN ('OPEN', 'CONFIRMED')
                                     AND v.severity = 'CRITICAL')::int AS critical_findings
            FROM repositories
            ${whereClause}
            ORDER BY created_at DESC, id DESC
            LIMIT $${params.length + 1}
        `, [...params, normalizedLimit + 1]);

        const items = result.rows;
        const hasMore = items.length > normalizedLimit;
        const pagedItems = hasMore ? items.slice(0, normalizedLimit) : items;

        return buildCursorPagination({
            items: pagedItems,
            limit: normalizedLimit,
            hasMore,
            cursorKey: 'created_at',
        });
    }
}

export const upsertRepositoryFromGithub = async ({ workspaceId, installationId, repositories }) => {
    const upserted = [];

    for (const repository of repositories || []) {
        const result = await query(
            `INSERT INTO repositories (
                workspace_id,
                github_repo_id,
                github_node_id,
                name,
                full_name,
                owner,
                installation_id,
                default_branch,
                is_private,
                last_synced_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            ON CONFLICT (github_repo_id)
            DO UPDATE SET
                workspace_id = EXCLUDED.workspace_id,
                github_node_id = EXCLUDED.github_node_id,
                name = EXCLUDED.name,
                full_name = EXCLUDED.full_name,
                owner = EXCLUDED.owner,
                installation_id = EXCLUDED.installation_id,
                default_branch = EXCLUDED.default_branch,
                is_private = EXCLUDED.is_private,
                last_synced_at = NOW(),
                updated_at = NOW()
            RETURNING id, github_repo_id, name, full_name, default_branch, is_private, last_synced_at`,
            [
                workspaceId,
                repository.id,
                repository.node_id,
                repository.name,
                repository.full_name,
                repository.owner?.login || '',
                installationId,
                repository.default_branch || 'main',
                Boolean(repository.private)
            ]
        );

        upserted.push(result.rows[0]);
    }

    return upserted;
};

export const findByGithubRepoId = async (githubRepoId) => {
    const result = await query(
        `SELECT id, workspace_id, name, full_name, default_branch, is_scanning_enabled FROM repositories WHERE github_repo_id = $1`,
        [githubRepoId]
    );
    return result.rows[0] || null;
};

export default RepositoryRepository;

