import axiosInstance from '@/lib/axios';
import type { Repository } from '@/types/common.types';
import type { PaginatedResponse } from '@/types/api.types';

export const repositoryApi = {
  listRepositories: async (workspaceId: string, cursor?: string, limit = 20): Promise<PaginatedResponse<Repository>> => {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());
    const { data } = await axiosInstance.get(`/pagination/repositories/${workspaceId}?${params.toString()}`);
    return data.data;
  },
  
  getWorkspaceRiskTrend: async (workspaceId: string) => {
    const { data } = await axiosInstance.get(`/analytics/${workspaceId}/risk-trend`);
    return data.data;
  },

  getRepositoryRiskTrend: async (workspaceId: string, repositoryId: string) => {
    const { data } = await axiosInstance.get(`/analytics/${workspaceId}/repositories/${repositoryId}/risk-history`);
    return data.data;
  }
};
