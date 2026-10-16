import { getInstallationAccessToken } from './github-auth.service.js';
import GithubClientService from './github-client.service.js';
import { upsertRepositoryFromGithub } from '../../repositories/repository.repository.js';

class RepositorySyncService {
    static async syncRepositoriesForWorkspace(installationId, workspaceId) {
        const token = await getInstallationAccessToken(installationId);
        const client = new GithubClientService(token);
        
        const response = await client.listRepositories();
        const repositories = response.repositories || [];

        return upsertRepositoryFromGithub({ workspaceId, installationId, repositories });
    }
}

export default RepositorySyncService;
