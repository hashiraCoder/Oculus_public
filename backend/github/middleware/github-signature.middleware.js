import { verifyGithubSignature } from '../utils/verify-signature.js';

export const githubSignatureMiddleware = (req, res, next) => {
    try {
        verifyGithubSignature(req);
        next();
    } catch (error) {
        next(error);
    }
};
