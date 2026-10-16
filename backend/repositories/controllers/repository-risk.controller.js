import { getPool } from '../../config/db.js';
import { asynchandler } from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/apiResponse.js';

export const getRepositoryRiskHistory = asynchandler(async (req, res) => {
    const { workspaceId, repositoryId } = req.params;
    const { days = 30 } = req.query;
    const pool = getPool();

    // Verify repo belongs to workspace
    const repoCheck = await pool.query(`SELECT id FROM repositories WHERE id = $1 AND workspace_id = $2`, [repositoryId, workspaceId]);
    if (repoCheck.rows.length === 0) {
        return res.status(404).json(new ApiResponse(404, null, 'Repository not found'));
    }

    const resHistory = await pool.query(`
        SELECT date_trunc('day', created_at) as day, 
               AVG(risk_score) as risk_score,
               AVG(critical_count) as critical_count,
               AVG(high_count) as high_count,
               AVG(medium_count) as medium_count,
               AVG(low_count) as low_count
        FROM repository_risk_snapshots
        WHERE repository_id = $1 AND created_at >= NOW() - INTERVAL '${parseInt(days)} days'
        GROUP BY day
        ORDER BY day ASC
    `, [repositoryId]);

    const formatted = resHistory.rows.map(row => ({
        date: row.day,
        score: Math.round(parseFloat(row.risk_score)),
        critical: Math.round(parseFloat(row.critical_count)),
        high: Math.round(parseFloat(row.high_count)),
        medium: Math.round(parseFloat(row.medium_count)),
        low: Math.round(parseFloat(row.low_count))
    }));

    res.status(200).json(new ApiResponse(200, formatted, 'Repository risk history retrieved successfully'));
});
