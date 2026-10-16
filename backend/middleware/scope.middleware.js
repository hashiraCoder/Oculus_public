import ApiError from '../utils/apiError.js';

export const requireScope = (requiredScope) => {
    return (req, res, next) => {
        if (req.machineIdentity) {
            if (!req.machineIdentity.scopes.includes(requiredScope)) {
                return next(new ApiError(403, `Token missing required scope: ${requiredScope}`));
            }
        }
        // If it's a human user (JWT), they inherently have all scopes, but workspace authorization is checked by requireWorkspaceAccess.
        next();
    };
};

