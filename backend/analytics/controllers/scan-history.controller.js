import { getPool } from '../../config/db.js';
import { asynchandler } from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/apiResponse.js';

export const getScanHistory = asynchandler(async (req, res) => {
    const { workspaceId } = req.params;
    const { repositoryId, cursor, limit = 20 } = req.query;
    const pool = getPool();

    let query = `
        SELECT s.id, s.status, s.started_at, s.finished_at, s.duration_ms, s.total_findings, s.created_at,
               r.current_risk_score, r.name as repo_name
        FROM scans s
        JOIN repositories r ON s.repository_id = r.id
        WHERE r.workspace_id = $1
    `;
    const values = [workspaceId];

    if (repositoryId) {
        values.push(repositoryId);
        query += ` AND s.repository_id = $${values.length}`;
    }

    // Cursor Pagination (created_at DESC, id DESC)
    if (cursor) {
        try {
            const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
            values.push(decoded.created_at, decoded.id);
            query += ` AND (s.created_at, s.id) < ($${values.length - 1}, $${values.length})`;
        } catch (e) {
            // Ignore invalid cursor
        }
    }

    values.push(parseInt(limit, 10) + 1);
    query += ` ORDER BY s.created_at DESC, s.id DESC LIMIT $${values.length}`;

    const { rows } = await pool.query(query, values);
    
    let nextCursor = null;
    if (rows.length > limit) {
        const nextItem = rows.pop(); // Remove the extra item
        nextCursor = Buffer.from(JSON.stringify({ 
            created_at: nextItem.created_at, 
            id: nextItem.id 
        })).toString('base64');
    }

    res.status(200).json(new ApiResponse(200, { items: rows, scans: rows, nextCursor }, 'Scan history retrieved successfully'));
});
