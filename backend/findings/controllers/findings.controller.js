import { asynchandler } from '../../utils/asyncHandler.js';
import FindingsService from '../services/findings.service.js';
import ApiResponse from '../../utils/apiResponse.js';

export const getFindings = asynchandler(async (req, res) => {
    const { workspaceId } = req.params;
    const { repositoryId, severity, status, rule, fromDate, toDate, cursor, limit } = req.query;
    
    const data = await FindingsService.getFindings(workspaceId, { 
        repositoryId,
        severity: severity ? String(severity).split(',').filter(Boolean) : undefined,
        status: status ? String(status).split(',').filter(Boolean) : undefined,
        rule, fromDate, toDate, cursor, limit
    });
    
    res.status(200).json(new ApiResponse(200, data, 'Findings retrieved successfully'));
});

export const getFingerprintHistory = asynchandler(async (req, res) => {
    const { workspaceId, fingerprint } = req.params;
    const data = await FindingsService.getFingerprintHistory(workspaceId, fingerprint);
    res.status(200).json(new ApiResponse(200, data, 'Fingerprint history retrieved successfully'));
});

export const updateFindingStatus = asynchandler(async (req, res) => {
    const { workspaceId, findingId } = req.params;
    const { status, comment } = req.body;
    const userId = req.user?.sub || null;

    await FindingsService.updateFindingStatus(workspaceId, findingId, status, comment, userId);
    res.status(200).json(new ApiResponse(200, null, 'Finding status updated successfully'));
});

export const bulkUpdateFindingStatus = asynchandler(async (req, res) => {
    const { workspaceId } = req.params;
    const { findingIds, status, comment } = req.body;
    const userId = req.user?.sub || null;

    await FindingsService.bulkUpdateFindingStatus(workspaceId, findingIds, status, comment, userId);
    res.status(200).json(new ApiResponse(200, null, 'Bulk finding status updated successfully'));
});

export const getFindingAudit = asynchandler(async (req, res) => {
    const { workspaceId, findingId } = req.params;
    const data = await FindingsService.getFindingAudit(workspaceId, findingId);
    res.status(200).json(new ApiResponse(200, data, 'Finding audit retrieved successfully'));
});
