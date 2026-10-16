import { sendViaResend } from './providers/resend.provider.js';
import logger from '../config/logger.js';

/**
 * Generic email sending service.
 * Dispatches to the active provider (e.g. Resend)
 * 
 * @param {Object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.html
 * @param {string} options.text
 * @returns {Promise<string>} The message ID from the provider
 */
export const sendEmail = async ({ to, subject, html, text }) => {
    logger.info(`[EmailService] Dispatching email to: ${to} (Subject: ${subject})`);
    
    // Abstracted to allow easy switching of providers later
    const messageId = await sendViaResend({ to, subject, html, text });
    
    logger.info(`[EmailService] Email dispatched successfully. MessageID: ${messageId}`);
    return messageId;
};
