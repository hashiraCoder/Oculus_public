import config from '../../config/env.js';

class GithubClientService {
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
            const status = response.status;
            let error = new Error(`GitHub request failed with status ${status}`);
            error.status = status;
            error.operation = path;

            // Classify errors based on Phase 3 requirements
            if ([429, 502, 503, 504].includes(status)) {
                error.isRetryable = true;
            } else if ([401, 403].includes(status)) {
                error.isPermanent = true;
                // 403 can be abuse detection, but usually indicates permission issues in this context
            }
            throw error;
        }

        // downloadFile might return raw content or json depending on accept header, 
        // assuming standard json response for contents API
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
        // Alias for backward compatibility
        return this.downloadRawFile(owner, repo, path);
    }

    async downloadRawFile(owner, repo, path) {
        // Returns raw file content as a string (not JSON).
        // Must NOT use the base request() method which always calls response.json().
        const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`, {
            headers: {
                Accept: 'application/vnd.github.raw', // Current non-deprecated raw header
                Authorization: `Bearer ${this.token}`,
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });

        if (!response.ok) {
            const status = response.status;
            const error = new Error(`GitHub raw file request failed with status ${status}: ${path}`);
            error.status = status;
            error.operation = `/repos/${owner}/${repo}/contents/${path}`;
            if ([429, 502, 503, 504].includes(status)) error.isRetryable = true;
            if ([401, 403].includes(status)) error.isPermanent = true;
            throw error;
        }

        return response.text();
    }

    async downloadTarball(owner, repo, ref) {
        const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/tarball/${ref}`, {
            headers: {
                Authorization: `Bearer ${this.token}`,
                Accept: 'application/vnd.github.v3.raw'
            },
        });
        
        if (!response.ok) {
            const error = new Error(`GitHub tarball request failed with status ${response.status}`);
            error.status = response.status;
            error.operation = `/repos/${owner}/${repo}/tarball/${ref}`;
            if ([429, 502, 503, 504].includes(response.status)) error.isRetryable = true;
            if ([401, 403].includes(response.status)) error.isPermanent = true;
            throw error;
        }
        
        return Buffer.from(await response.arrayBuffer());
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

export default GithubClientService;
