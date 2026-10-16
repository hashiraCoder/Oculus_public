import { asynchandler } from '../../utils/asyncHandler.js';
import AnalyticsService from '../services/analytics.service.js';
import ApiResponse from '../../utils/apiResponse.js';

export const getSecurityPosture = asynchandler(async (req, res) => {
    const { workspaceId } = req.params;
    const data = await AnalyticsService.getSecurityPosture(workspaceId);
    res.status(200).json(new ApiResponse(200, data, 'Security posture retrieved successfully'));
});

export const getWorkspaceSummary = asynchandler(async (req, res) => {
    const { workspaceId } = req.params;
    const data = await AnalyticsService.getWorkspaceSummary(workspaceId);
    res.status(200).json(new ApiResponse(200, data, 'Workspace summary retrieved successfully'));
});

export const getRiskTrend = asynchandler(async (req, res) => {
    const { workspaceId } = req.params;
    const { days } = req.query;
    const data = await AnalyticsService.getRiskTrend(workspaceId, days || 30);
    res.status(200).json(new ApiResponse(200, data, 'Risk trend retrieved successfully'));
});

export const getFindingDistribution = asynchandler(async (req, res) => {
    const { workspaceId } = req.params;
    const data = await AnalyticsService.getFindingDistribution(workspaceId);
    res.status(200).json(new ApiResponse(200, data, 'Finding distribution retrieved successfully'));
});

export const getRepositoryRanking = asynchandler(async (req, res) => {
    const { workspaceId } = req.params;
    const data = await AnalyticsService.getRepositoryRanking(workspaceId);
    res.status(200).json(new ApiResponse(200, data, 'Repository ranking retrieved successfully'));
});
