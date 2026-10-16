import GithubTokenService from './github-token.service.js';
import config from '../../config/env.js';
import logger from '../../config/logger.js';

class GithubCheckService {
    static async createCheckRun({ installationId, owner, repo, headSha, status, name = 'Oculus Security Scan' }) {
        const token = await GithubTokenService.getInstallationAccessToken(installationId);
        
        const payload = {
            name,
            head_sha: headSha,
            status, // 'queued', 'in_progress', 'completed'
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(new Error('GitHub API request timed out after 10000ms')), 10000);

        try {
            const response = await fetch(`${config.github.apiBaseUrl}/repos/${owner}/${repo}/check-runs`, {
                method: 'POST',
                headers: {
                    Accept: 'application/vnd.github+json',
                    Authorization: `Bearer ${token}`,
                    'X-GitHub-Api-Version': '2022-11-28',
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            if (!response.ok) {
                const error = new Error(`Failed to create Check Run: ${response.status}`);
                error.status = response.status;
                error.retryAfter = response.headers.get('retry-after');
                throw error;
            }

            return response.json();
        } finally {
            clearTimeout(timeoutId);
        }
    }

    static async completeCheckRun({ installationId, owner, repo, checkRunId, conclusion, output }) {
        const token = await GithubTokenService.getInstallationAccessToken(installationId);
        
        const payload = {
            status: 'completed',
            conclusion,
            output
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(new Error('GitHub API request timed out after 10000ms')), 10000);

        try {
            const response = await fetch(`${config.github.apiBaseUrl}/repos/${owner}/${repo}/check-runs/${checkRunId}`, {
                method: 'PATCH',
                headers: {
                    Accept: 'application/vnd.github+json',
                    Authorization: `Bearer ${token}`,
                    'X-GitHub-Api-Version': '2022-11-28',
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            if (!response.ok) {
                const error = new Error(`Failed to update Check Run: ${response.status}`);
                error.status = response.status;
                error.retryAfter = response.headers.get('retry-after');
                throw error;
            }

            return response.json();
        } finally {
            clearTimeout(timeoutId);
        }
    }
}

export default GithubCheckService;
