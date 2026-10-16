import { asynchandler } from '../utils/asyncHandler.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import AuthService from '../services/auth.service.js';
import { verifyJwt } from '../middleware/auth.middleware.js';
import config from '../config/env.js';

class AuthController {
    static setRefreshCookie(res, refreshToken) {
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: config.isProd,
            sameSite: config.isProd ? 'none' : 'strict',
            path: '/api',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            ...(config.isProd && { partitioned: true })
        });
    }

    static clearAuthCookies(res) {
        const cookieOptions = {
            httpOnly: true,
            secure: config.isProd,
            sameSite: config.isProd ? 'none' : 'strict',
            path: '/api',
            ...(config.isProd && { partitioned: true })
        };

        res.clearCookie('refresh_token', cookieOptions);
        res.clearCookie('jwt_token', cookieOptions);
    }

    static register = asynchandler(async (req, res) => {
        const { email, password, name } = req.body;
        const { user, workspaces, accessToken, refreshToken, isDuplicate } = await AuthService.registerUser(email, password, name);

        if (isDuplicate) {
            throw new ApiError(409, 'Email is already registered in the system.');
        }

        AuthController.setRefreshCookie(res, refreshToken);

        return res
            .status(201)
            .json(new ApiResponse(201, {
                user,
                workspaces,
                accessToken
            }, 'Registration successful. Default workspace created.'));
    });

    static login = asynchandler(async (req, res) => {
        const { email, password } = req.body;
        const { user, workspaces, accessToken, refreshToken } = await AuthService.loginUser(email, password, req.ip);

        AuthController.setRefreshCookie(res, refreshToken);

        return res
            .status(200)
            .json(new ApiResponse(200, {
                user,
                workspaces,
                accessToken
            }, 'Login successful.'));
    });

    static forgotPassword = asynchandler(async (req, res) => {
        const { email } = req.body;

        await AuthService.forgotPassword(email, req.ip);

        return res
            .status(200)
            .json(new ApiResponse(200, null, 'If this email is registered, we have sent a password reset link.'));
    });

    static resetPassword = asynchandler(async (req, res) => {
        const { token, password } = req.body;

        await AuthService.resetPassword(token, password);

        return res
            .status(200)
            .json(new ApiResponse(200, null, 'Password reset successful.'));
    });

    static refresh = asynchandler(async (req, res) => {
        try {
            const { user, workspaces, accessToken, refreshToken } = await AuthService.refreshSession(req.cookies?.refresh_token);

            AuthController.setRefreshCookie(res, refreshToken);

            return res
                .status(200)
                .json(new ApiResponse(200, {
                    user,
                    workspaces,
                    accessToken
                }, 'Session refreshed.'));
        } catch (error) {
            if (error?.statusCode === 401 && req.cookies?.refresh_token) {
                AuthController.clearAuthCookies(res);
            }

            throw error;
        }
    });

    static logout = asynchandler(async (req, res) => {
        await AuthService.logoutSession(req.cookies?.refresh_token);

        AuthController.clearAuthCookies(res);

        return res
            .status(200)
            .json(new ApiResponse(200, null, 'Logout successful.'));
    });

    static logoutAll = [
        verifyJwt,
        asynchandler(async (req, res) => {
            await AuthService.logoutAllSessions(req.user?.sub);

            AuthController.clearAuthCookies(res);

            return res
                .status(200)
                .json(new ApiResponse(200, null, 'Logged out from all devices.'));
        })
    ];
}

export default AuthController;