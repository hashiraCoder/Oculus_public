import { asynchandler } from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/apiResponse.js';
import WorkspaceService from '../services/workspace.service.js';

class WorkspaceController {
    static listWorkspaces = asynchandler(async (req, res) => {
        const userId = req.user.sub;
        const workspaces = await WorkspaceService.getUserWorkspaces(userId);
        
        return res
            .status(200)
            .json(new ApiResponse(200, workspaces, 'Workspaces retrieved successfully.'));
    });

    static getWorkspace = asynchandler(async (req, res) => {
        const userId = req.user.sub;
        const workspaceId = req.params.id;
        const workspace = await WorkspaceService.getWorkspaceById(userId, workspaceId);
        
        return res
            .status(200)
            .json(new ApiResponse(200, workspace, 'Workspace details retrieved successfully.'));
    });
    static getMembers = asynchandler(async (req, res) => {
        const userId = req.user.sub;
        const workspaceId = req.params.id;
        const members = await WorkspaceService.getWorkspaceMembers(userId, workspaceId);
        
        return res
            .status(200)
            .json(new ApiResponse(200, members, 'Workspace members retrieved successfully.'));
    });

    static updateWorkspace = asynchandler(async (req, res) => {
        const workspace = await WorkspaceService.updateWorkspace(req.user.sub, req.params.id, req.body?.name);
        return res.status(200).json(new ApiResponse(200, workspace, 'Workspace updated successfully.'));
    });

    static deleteWorkspace = asynchandler(async (req, res) => {
        await WorkspaceService.removeWorkspace(req.user.sub, req.params.id);
        return res.status(200).json(new ApiResponse(200, null, 'Workspace deleted successfully.'));
    });

    static getRiskWeights = asynchandler(async (req, res) => {
        const userId = req.user.sub;
        const workspaceId = req.params.id;
        const result = await WorkspaceService.getRiskWeights(userId, workspaceId);

        return res
            .status(200)
            .json(new ApiResponse(200, result, 'Risk weights retrieved successfully.'));
    });

    static updateRiskWeights = asynchandler(async (req, res) => {
        const userId = req.user.sub;
        const workspaceId = req.params.id;
        const result = await WorkspaceService.upsertRiskWeights(userId, workspaceId, req.body || {});

        return res
            .status(200)
            .json(new ApiResponse(200, result, 'Risk weights updated successfully.'));
    });
}

export default WorkspaceController;
