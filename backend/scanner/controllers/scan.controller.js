import ScanService from '../services/scan.service.js';
import ApiResponse from '../../utils/apiResponse.js';

class ScanController {
    static _getAuthContext(req) {
        return {
            machineWorkspaceId: req.machineIdentity?.workspaceId,
            userId: req.user?.sub
        };
    }

    static async getScanDetails(req, res) {
        const { id } = req.params;
        const scan = await ScanService.getScanDetails(id, ScanController._getAuthContext(req));
        return res.status(200).json(new ApiResponse(200, scan, 'Scan details fetched successfully'));
    }

    static async getScanTimeline(req, res) {
        const { id } = req.params;
        const timeline = await ScanService.getScanTimeline(id, ScanController._getAuthContext(req));
        return res.status(200).json(new ApiResponse(200, timeline, 'Scan timeline fetched successfully'));
    }

    static async getScanLogs(req, res) {
        const { id } = req.params;
        const logs = await ScanService.getScanLogs(id, ScanController._getAuthContext(req));
        return res.status(200).json(new ApiResponse(200, logs, 'Scan logs fetched successfully'));
    }

    static async getScanGateStatus(req, res) {
        const { id } = req.params;
        const gateInfo = await ScanService.getScanGateStatus(id, ScanController._getAuthContext(req));
        // Do not wrap in ApiResponse data structure to keep it explicitly matched to the contract.
        // Wait, standardizing is better if CLI uses ApiResponse. But contract says `execution` and `gate` at root.
        // I will return JSON directly to match the design contract.
        return res.status(200).json(gateInfo);
    }

    static async cancelScan(req, res) {
        const { id } = req.params;
        await ScanService.cancelScan(id, ScanController._getAuthContext(req));
        return res.status(200).json(new ApiResponse(200, null, 'Scan cancellation requested'));
    }

    static async retryScan(req, res) {
        const { id } = req.params;
        await ScanService.retryScan(id, ScanController._getAuthContext(req));
        return res.status(200).json(new ApiResponse(200, null, 'Scan retry requested'));
    }

    static async triggerScan(req, res) {
        const { repositoryId, commitSha, branch, triggerSource } = req.body;
        if (!repositoryId) return res.status(400).json(new ApiResponse(400, null, 'repositoryId is required'));
        
        // If this is triggered by a Machine Token, prefix triggerSource if not provided or to ensure transparency
        const source = triggerSource || (req.machineIdentity ? 'api:cli' : 'api:manual');
        const idempotencyKey = req.header('Idempotency-Key');

        const result = await ScanService.triggerScan(repositoryId, commitSha, branch, source, ScanController._getAuthContext(req), idempotencyKey);
        return res.status(201).json(new ApiResponse(201, result, 'Manual scan triggered'));
    }
}

export default ScanController;
