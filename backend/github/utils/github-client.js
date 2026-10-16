import config from '../../config/env.js';

class GithubClient {
    constructor(token) {
        this.token = token;
        this.baseUrl = config.github.apiBaseUrl;
    }

    async request(path, options = {}) {
        const response = await fetch(`${this.baseUrl}${path}`, {
            ...options,
            headers: {
                Accept: 'application/vnd.github+json',
                Authorization: `Bearer ${this.token}`,
                'X-GitHub-Api-Version': '2022-11-28',
                ...(options.headers || {}),
            },
        });

        if (!response.ok) {
            throw new Error(`GitHub request failed with status ${response.status}`);
        }

        return response.json();
    }

    listRepositories() {
        return this.request('/installation/repositories');
    }

    getPullRequest(owner, repo, pullNumber) {
        return this.request(`/repos/${owner}/${repo}/pulls/${pullNumber}`);
    }

    getPullRequestFiles(owner, repo, pullNumber) {
        return this.request(`/repos/${owner}/${repo}/pulls/${pullNumber}/files`);
    }

    downloadFile(owner, repo, path) {
        return this.request(`/repos/${owner}/${repo}/contents/${path}`);
    }

    createCheckRun(owner, repo, payload) {
        return this.request(`/repos/${owner}/${repo}/check-runs`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    updateCheckRun(owner, repo, checkRunId, payload) {
        return this.request(`/repos/${owner}/${repo}/check-runs/${checkRunId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    }
}

export default GithubClient;