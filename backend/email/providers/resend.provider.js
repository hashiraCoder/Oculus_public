import { Resend } from 'resend';
import config from '../../config/env.js';
import logger from '../../config/logger.js';
import ApiError from '../../utils/apiError.js';

const resend = new Resend(config.email.resendApiKey);

/**
 * Send an email using Resend provider
 * @param {Object} options 
 * @param {string} options.to 
 * @param {string} options.subject 
 * @param {string} options.html 
 * @param {string} options.text 
 */
export const sendViaResend = async ({ to, subject, html, text }) => {
    try {
        const { data, error } = await resend.emails.send({
            from: config.email.from,
            to,
            subject,
            html,
            text
        });

        if (error) {
            logger.error('[ResendProvider] Failed to send email:', error);
            throw new ApiError(500, 'Failed to send email. Please try again later.');
        }

        return data.id; // Return Resend message ID
    } catch (err) {
        logger.error('[ResendProvider] Exception sending email:', err);
        throw new ApiError(500, 'Failed to send email. Please try again later.');
    }
};
