import crypto from 'crypto';
import ApiError from '../../utils/apiError.js';
import config from '../../config/env.js';

export const verifyGithubSignature = (req) => {
    const signature = req.header('X-Hub-Signature-256');

    if (!config.github.webhookSecret) {
        throw new ApiError(500, 'GitHub webhook secret is not configured on the server.');
    }

    if (!signature || !req.body) {
        throw new ApiError(401, 'Invalid GitHub webhook signature.');
    }

    const bodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
    const expected = `sha256=${crypto.createHmac('sha256', config.github.webhookSecret).update(bodyBuffer).digest('hex')}`;

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
        throw new ApiError(401, 'Invalid GitHub webhook signature.');
    }

    return true;
};