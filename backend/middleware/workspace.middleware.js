import ApiError from '../utils/apiError.js';
import { asynchandler } from '../utils/asyncHandler.js';
import { findUserWorkspaceRole } from '../repositories/workspace.repository.js';

/**
 * Middleware to verify that the authenticated user has access to a workspace.
 * Requires `verifyJwt` to be run before this middleware.
 * Looks for workspaceId in params, query, or body.
 */
export const requireWorkspaceAccess = asynchandler(async (req, res, next) => {
    const workspaceId = req.params.workspaceId || req.params.id || req.query.workspaceId || req.body.workspaceId;
    
    if (!workspaceId) {
        throw new ApiError(400, 'Workspace ID is required to verify access');
    }

    if (req.machineIdentity) {
        if (req.machineIdentity.workspaceId !== workspaceId) {
            throw new ApiError(403, 'Forbidden: Token does not have access to this workspace');
        }
        req.workspaceRole = 'MACHINE';
        return next();
    }

    if (!req.user || !req.user.sub) {
        throw new ApiError(401, 'Authentication required to verify workspace access');
    }

    const role = await findUserWorkspaceRole(req.user.sub, workspaceId);

    if (!role) {
        throw new ApiError(403, 'Forbidden: You do not have access to this workspace');
    }

    // Attach the role to the request for downstream controllers
    req.workspaceRole = role;

    next();
});
