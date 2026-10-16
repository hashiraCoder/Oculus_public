import GithubClientService from './github-client.service.js';
import { getInstallationAccessToken } from './github-auth.service.js';

class CheckRunService {
    static async createCheckRun({ installationId, owner, repo, headSha, name = 'Oculus Scanner', status = 'in_progress', conclusion, output = null }) {
        const token = await getInstallationAccessToken(installationId);
        const client = new GithubClientService(token);

        const payload = {
            name,
            head_sha: headSha,
            status,
            output
        };

        if (conclusion) {
            payload.conclusion = conclusion;
        }

        return client.createCheckRun(owner, repo, payload);
    }

    static async updateCheckRun({ installationId, owner, repo, checkRunId, status, conclusion, output }) {
        const token = await getInstallationAccessToken(installationId);
        const client = new GithubClientService(token);

        const payload = {
            status,
        };
        
        if (conclusion) {
            payload.conclusion = conclusion;
        }

        if (output) {
            payload.output = output;
        }

        return client.updateCheckRun(owner, repo, checkRunId, payload);
    }
}

export default CheckRunService;
