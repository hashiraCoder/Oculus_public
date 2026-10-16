import { getPool } from '../../config/db.js';
import { asynchandler } from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/apiResponse.js';

export const getDeveloperLeaderboard = asynchandler(async (req, res) => {
    const { workspaceId } = req.params;
    const pool = getPool();

    // Use materialized metrics instead of expensive live aggregate
    const resLeaderboard = await pool.query(`
        SELECT 
            gdi.github_username,
            gdi.github_user_id,
            m.open_findings_introduced as risk_introduced,
            m.findings_resolved as risk_fixed,
            m.scans_triggered as total_prs,
            (m.findings_resolved * 100 / GREATEST(m.open_findings_introduced + m.findings_resolved, 1)) as security_score
        FROM github_developer_identities gdi
        JOIN workspace_developer_metrics m ON m.github_identity_id = gdi.id
        WHERE gdi.workspace_id = $1
        ORDER BY security_score DESC, risk_introduced ASC
        LIMIT 20
    `, [workspaceId]);

    res.status(200).json(new ApiResponse(200, resLeaderboard.rows, 'Developer leaderboard retrieved successfully'));
});
