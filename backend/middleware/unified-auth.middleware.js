import { verifyJwt } from './auth.middleware.js';
import { verifyDeveloperToken } from './token.middleware.js';

export const unifiedAuth = (req, res, next) => {
    const authHeader = req.header('Authorization') || '';
    
    if (authHeader.startsWith('Bearer ocx_live_')) {
        return verifyDeveloperToken(req, res, next);
    }

    // Fall back to JWT for everything else
    return verifyJwt(req, res, next);
};

