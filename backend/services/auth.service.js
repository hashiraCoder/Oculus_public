import {
    registerUser,
    loginUser,
    forgotPassword,
    resetPassword,
    cleanupPasswordResets,
    refreshSession,
    logoutSession,
    logoutAllSessions,
    cleanupExpiredSessions
} from '../auth/services/index.js';

class AuthService {
    static registerUser(email, password, name) {
        return registerUser(email, password, name);
    }

    static loginUser(email, password, requestIp) {
        return loginUser(email, password, requestIp);
    }

    static forgotPassword(email, requestIp) {
        return forgotPassword(email, requestIp);
    }

    static resetPassword(token, password) {
        return resetPassword(token, password);
    }

    static cleanupPasswordResets(cutoffInterval) {
        return cleanupPasswordResets(cutoffInterval);
    }

    static refreshSession(refreshToken) {
        return refreshSession(refreshToken);
    }

    static logoutSession(refreshToken) {
        return logoutSession(refreshToken);
    }

    static logoutAllSessions(userId) {
        return logoutAllSessions(userId);
    }

    static cleanupExpiredSessions(cutoffInterval) {
        return cleanupExpiredSessions(cutoffInterval);
    }
}

export default AuthService;
