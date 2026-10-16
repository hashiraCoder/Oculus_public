import axiosInstance from '@/lib/axios';
import type { Scan, Finding } from '@/types/common.types';
import type { PaginatedResponse } from '@/types/api.types';

export const scansApi = {
  getScanHistory: async (workspaceId: string, cursor?: string, limit = 20): Promise<PaginatedResponse<Scan>> => {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());
    const { data } = await axiosInstance.get(`/analytics/${workspaceId}/scans/history?${params.toString()}`);
    const raw = data.data;
    return {
      items: raw?.items || raw?.scans || [],
      nextCursor: raw?.nextCursor || null,
      total: raw?.total
    };
  },

  getRepositoryScans: async (repositoryId: string, cursor?: string, limit = 20): Promise<PaginatedResponse<Scan>> => {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());
    const { data } = await axiosInstance.get(`/pagination/scans/${repositoryId}?${params.toString()}`);
    return data.data;
  },

  getScanVulnerabilities: async (scanId: string, cursor?: string, limit = 20): Promise<PaginatedResponse<Finding>> => {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());
    const { data } = await axiosInstance.get(`/pagination/vulnerabilities/${scanId}?${params.toString()}`);
    return data.data;
  }
};
