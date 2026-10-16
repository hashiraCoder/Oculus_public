import axiosInstance from '@/lib/axios';
import type { 
  GithubConnectRequestDTO, 
  GithubDisconnectRequestDTO, 
  GithubSyncRequestDTO,
  GithubResponseDTO
} from '../dto/github.dto';

export const githubApi = {
  getInstallUrl: async (workspaceId: string): Promise<{ data: { url: string } }> => {
    const res = await axiosInstance.get(`/github/install-url?workspaceId=${workspaceId}`);
    return res.data;
  },

  connectGithub: async (data: GithubConnectRequestDTO): Promise<GithubResponseDTO> => {
    const res = await axiosInstance.post('/github/connect', data);
    return res.data;
  },

  disconnectGithub: async (data: GithubDisconnectRequestDTO): Promise<GithubResponseDTO> => {
    // Axios DELETE with body requires the `data` config property
    const res = await axiosInstance.delete('/github/disconnect', { data });
    return res.data;
  },

  syncGithub: async (data: GithubSyncRequestDTO): Promise<GithubResponseDTO> => {
    const res = await axiosInstance.post('/github/sync', data);
    return res.data;
  }
};
