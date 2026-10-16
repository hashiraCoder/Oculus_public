import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/apiResponse.js';
import InstallationService from '../services/installation.service.js';
import RepositorySyncService from '../services/repository-sync.service.js';
import config from '../../config/env.js';
import logger from '../../config/logger.js';
import jwt from 'jsonwebtoken';
import { findWorkspaceById, updateWorkspaceSyncStatus } from '../../repositories/workspace.repository.js';

class InstallationController {
    static getInstallUrl = asyncHandler(async (req, res) => {
        const { workspaceId } = req.query;
        const userId = req.user.sub;

        const url = await InstallationService.generateInstallUrl({ workspaceId, userId });
        res.status(200).json(new ApiResponse(200, { url }, 'Install URL generated.'));
    });

    static callback = asyncHandler(async (req, res) => {
        const { installation_id, setup_action, state } = req.query;
        let frontendUrl = config.email.frontendUrl || config.cors.origin[0] || 'http://localhost:5173';
        
        console.log("CALLBACK START");
        console.log({
            installationId: installation_id,
            setupAction: setup_action,
            hasState: Boolean(state)
        });
        
        logger.info(`[GitHub Callback Stage 1: Received] installation_id=${installation_id}, setup_action=${setup_action}, has_state=${!!state}`);
        
        try {
            // Early fallback if user cancelled without state (GitHub might drop state on cancel)
            if (!state) {
                 logger.info(`[GitHub Callback Stage 2: Missing State] Redirecting to cancelled.`);
                 return res.redirect(`${frontendUrl}/settings?status=cancelled&reason=missing_state`);
            }

            // Decode state just to extract workspaceId for the redirect, even if it fails verification later
            let workspaceId = null;
            try {
                const decoded = jwt.decode(state);
                workspaceId = decoded?.workspaceId;
                logger.info(`[GitHub Callback Stage 2: State Decoded] workspaceId=${workspaceId}`);
            } catch (e) {
                logger.warn('[GitHub Callback] Could not decode state to find workspaceId');
            }

            const redirectBase = workspaceId ? `${frontendUrl}/w/${workspaceId}/settings` : `${frontendUrl}/settings`;

            if (setup_action === 'cancel' || req.query.error) {
                 logger.info(`[GitHub Callback Stage 3: Cancelled/Error] Redirecting to cancelled. Error: ${req.query.error}`);
                 return res.redirect(`${redirectBase}?status=cancelled&reason=${req.query.error || 'user_cancelled'}`);
            }

            logger.info(`[GitHub Callback Stage 3: Processing] Calling InstallationService.processCallback`);
            await InstallationService.processCallback({ 
                installationId: installation_id, 
                setupAction: setup_action, 
                state 
            });

            logger.info(`[GitHub Callback Stage 4: Success] Redirecting to connected.`);
            res.redirect(`${redirectBase}?status=connected`);
        } catch (error) {
            console.error({
                message: error.message,
                name: error.name,
                stack: error.stack
            });
            
            let reason = 'internal_error';
            const msg = error?.message || '';
            const code = error?.statusCode || 0;

            if (msg.includes('Missing state'))                   reason = 'missing_state';
            else if (msg.includes('Invalid or expired state'))   reason = 'expired_state';
            else if (msg.includes('Invalid state purpose'))      reason = 'invalid_state';
            else if (msg.includes('Invalid GitHub installation')) reason = 'installation_not_found';
            else if (code === 403)                               reason = 'permission_denied';
            else if (msg.includes('Failed to verify'))           reason = 'github_api_error';

            logger.error(`[GitHub Callback] step=processCallback reason=${reason} error=${msg}`);
            
            let workspaceId = null;
            try {
                if (state) {
                    const decoded = jwt.decode(state);
                    workspaceId = decoded?.workspaceId;
                }
            } catch (e) {}

            const redirectBase = workspaceId ? `${frontendUrl}/w/${workspaceId}/settings` : `${frontendUrl}/settings`;
            logger.info(`[GitHub Callback Stage 4: Failed] reason=${reason} Redirecting.`);
            res.redirect(`${redirectBase}?status=failed&reason=${reason}`);
        }
    });

    static connect = asyncHandler(async (req, res) => {
        res.status(410).json(new ApiResponse(410, null, 'This endpoint is deprecated. Use callback flow.'));
    });

    static disconnect = asyncHandler(async (req, res) => {
        const { workspaceId } = req.body;
        const userId = req.user.sub;

        await InstallationService.disconnect({ workspaceId, userId });

        res.status(200).json(new ApiResponse(200, null, 'GitHub installation disconnected successfully.'));
    });

    static sync = asyncHandler(async (req, res) => {
        const { workspaceId, installationId, installation_id, state } = req.body;
        let targetInstallationId = installationId || installation_id;

        let targetWorkspaceId = workspaceId;
        if (!targetWorkspaceId && state) {
            try {
                const decoded = jwt.decode(state);
                targetWorkspaceId = decoded?.workspaceId;
            } catch (e) {
                logger.warn('[GitHub Sync] Could not decode state to find workspaceId');
            }
        }

        if (!targetWorkspaceId) {
            return res.status(400).json(new ApiResponse(400, null, 'Workspace ID is required for sync.'));
        }

        if (!targetInstallationId) {
            const workspace = await findWorkspaceById(targetWorkspaceId);
            if (workspace && workspace.github_installation_id) {
                targetInstallationId = workspace.github_installation_id;
            }
        }

        if (!targetInstallationId) {
            return res.status(400).json(new ApiResponse(400, null, 'Installation ID is required. Please connect GitHub first.'));
        }
        
        try {
            await updateWorkspaceSyncStatus(targetWorkspaceId, 'SYNCING');
            await RepositorySyncService.syncRepositoriesForWorkspace(targetInstallationId, targetWorkspaceId);
            await updateWorkspaceSyncStatus(targetWorkspaceId, 'READY');
            res.status(200).json(new ApiResponse(200, null, 'Repositories synced successfully.'));
        } catch (error) {
            await updateWorkspaceSyncStatus(targetWorkspaceId, 'FAILED');
            throw error;
        }
    });
}

export default InstallationController;
