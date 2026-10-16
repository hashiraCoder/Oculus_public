import TokenService from '../services/token.service.js';
import { asynchandler } from '../../utils/asyncHandler.js';
import ApiError from '../../utils/apiError.js';
import { validateScopes, DEVELOPER_TOKEN_SCOPES } from '../../config/scopes.js';

class TokenController {
    static createToken = asynchandler(async (req, res) => {
        const workspaceId = req.params.id;
        const { name, scopes, expiresAt } = req.body;
        if (!name) throw new ApiError(400, 'Token name is required');
        
        // Ensure default scopes or validate requested scopes
        let tokenScopes = Array.isArray(scopes) ? scopes : [DEVELOPER_TOKEN_SCOPES.SCANS_READ, DEVELOPER_TOKEN_SCOPES.SCANS_CREATE];
        
        // Validate all requested scopes are allowed
        const invalidScopes = validateScopes(tokenScopes);
        if (invalidScopes.length > 0) {
            throw new ApiError(400, `Invalid scopes: ${invalidScopes.join(', ')}`);
        }

        // Handle expiration (default 90 days)
        let tokenExpiresAt = null;
        if (expiresAt === 'never') {
            tokenExpiresAt = null;
        } else if (expiresAt) {
            tokenExpiresAt = new Date(expiresAt);
            if (isNaN(tokenExpiresAt.getTime())) throw new ApiError(400, 'Invalid expiresAt date format');
        } else {
            // Default 90 days
            tokenExpiresAt = new Date();
            tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 90);
        }
        
        const tokenData = await TokenService.createToken(workspaceId, name, req.user.sub, tokenScopes, tokenExpiresAt);
        res.status(201).json(tokenData);
    });

    static listTokens = asynchandler(async (req, res) => {
        const workspaceId = req.params.id;
        const tokens = await TokenService.listTokens(workspaceId);
        res.status(200).json(tokens);
    });

    static revokeToken = asynchandler(async (req, res) => {
        const workspaceId = req.params.id;
        const tokenId = req.params.tokenId;
        await TokenService.revokeToken(workspaceId, tokenId, req.user.sub);
        res.status(200).json({ message: 'Token revoked successfully' });
    });

    static rotateToken = asynchandler(async (req, res) => {
        const workspaceId = req.params.id;
        const tokenId = req.params.tokenId;
        const newTokenData = await TokenService.rotateToken(workspaceId, tokenId, req.user.sub);
        res.status(201).json(newTokenData);
    });
}

export default TokenController;

