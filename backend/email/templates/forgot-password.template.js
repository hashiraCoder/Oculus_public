/**
 * Forgot password template builders
 * @param {Object} options
 * @param {string} options.resetUrl
 * @param {string} [options.userName]
 * @returns {{ html: string, text: string }}
 */
export const forgotPasswordTemplate = ({ resetUrl, userName = 'there' }) => {
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #1a1a1a;">Password Reset Request</h2>
            <p>Hi ${userName},</p>
            <p>You recently requested to reset your password for your Oculus account.</p>
            <p>Click the button below to reset it. This link will expire in 1 hour.</p>
            <div style="margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
            </div>
            <p>If you did not request a password reset, please ignore this email. This password reset is only valid for the next 60 minutes.</p>
        </div>
    `;

    const text = `Hi ${userName},

You recently requested to reset your password for your Oculus account.

Please open the following link in your browser to reset it. This link will expire in 1 hour.

${resetUrl}

If you did not request a password reset, please ignore this email. This password reset is only valid for the next 60 minutes.
`;

    return { html, text };
};
