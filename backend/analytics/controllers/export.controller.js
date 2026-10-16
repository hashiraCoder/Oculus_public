import { getPool } from '../../config/db.js';
import { asynchandler } from '../../utils/asyncHandler.js';
import { stringify } from 'csv-stringify/sync';

const fetchExportData = async (workspaceId) => {
    const pool = getPool();
    const res = await pool.query(`
        SELECT v.id, v.rule_type, v.severity, v.file_path, v.line_number, v.status, 
               v.created_at, r.name as repo_name, s.head_sha
        FROM vulnerabilities v
        JOIN scans s ON v.scan_id = s.id
        JOIN repositories r ON s.repository_id = r.id
        WHERE r.workspace_id = $1
    `, [workspaceId]);
    return res.rows;
};

export const exportFindings = asynchandler(async (req, res) => {
    const { workspaceId } = req.params;
    const { format } = req.query; // json, csv, sarif
    
    const rows = await fetchExportData(workspaceId);

    if (format === 'csv') {
        res.header('Content-Type', 'text/csv');
        res.attachment('findings.csv');
        return res.send(stringify(rows, { header: true }));
    }

    if (format === 'sarif') {
        // Build SARIF output
        const sarif = {
            version: "2.1.0",
            $schema: "http://json.schemastore.org/sarif-2.1.0-rtm.5",
            runs: [
                {
                    tool: {
                        driver: {
                            name: "Oculus Security",
                            informationUri: "https://oculus.security",
                            rules: Array.from(new Set(rows.map(r => r.rule_type))).map(rule => ({ id: rule }))
                        }
                    },
                    results: rows.map(r => ({
                        ruleId: r.rule_type,
                        level: r.severity === 'CRITICAL' || r.severity === 'HIGH' ? 'error' : 'warning',
                        message: { text: `Found ${r.rule_type} in ${r.file_path}` },
                        locations: [{
                            physicalLocation: {
                                artifactLocation: { uri: r.file_path },
                                region: { startLine: r.line_number || 1 }
                            }
                        }]
                    }))
                }
            ]
        };
        res.header('Content-Type', 'application/json');
        res.attachment('findings.sarif.json');
        return res.send(JSON.stringify(sarif, null, 2));
    }

    // Default to JSON
    res.header('Content-Type', 'application/json');
    res.attachment('findings.json');
    return res.send(JSON.stringify(rows, null, 2));
});
