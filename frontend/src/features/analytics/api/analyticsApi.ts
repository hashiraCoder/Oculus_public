import axiosInstance from '@/lib/axios';
import type { 
  SecurityPostureDTO, 
  WorkspaceSummaryDTO, 
  RiskTrendDTO, 
  FindingDistributionDTO, 
  RepositoryRankingDTO, 
  DeveloperLeaderboardDTO 
} from '../dto/analytics.dto';

export const analyticsApi = {
  getSecurityPosture: async (workspaceId: string): Promise<SecurityPostureDTO> => {
    const res = await axiosInstance.get(`/analytics/${workspaceId}/security-posture`);
    return res.data.data; // Using standard ApiResponse unwrapping
  },
  
  getWorkspaceSummary: async (workspaceId: string): Promise<WorkspaceSummaryDTO> => {
    const res = await axiosInstance.get(`/analytics/${workspaceId}/summary`);
    return res.data.data;
  },
  
  getRiskTrend: async (workspaceId: string, days: number = 30): Promise<RiskTrendDTO[]> => {
    const res = await axiosInstance.get(`/analytics/${workspaceId}/risk-trend?days=${days}`);
    return res.data.data;
  },
  
  getFindingDistribution: async (workspaceId: string): Promise<FindingDistributionDTO[]> => {
    const res = await axiosInstance.get(`/analytics/${workspaceId}/finding-distribution`);
    return res.data.data;
  },
  
  getRepositoryRanking: async (workspaceId: string): Promise<RepositoryRankingDTO> => {
    const res = await axiosInstance.get(`/analytics/${workspaceId}/repository-ranking`);
    return res.data.data;
  },
  
  getDeveloperLeaderboard: async (workspaceId: string): Promise<DeveloperLeaderboardDTO[]> => {
    const res = await axiosInstance.get(`/analytics/${workspaceId}/developers/leaderboard`);
    return res.data.data;
  },
  
  getRecentScans: async (workspaceId: string, limit: number = 5): Promise<any[]> => {
    const res = await axiosInstance.get(`/analytics/${workspaceId}/scans/history?limit=${limit}`);
    const raw = res.data?.data;
    return raw?.items || raw?.scans || [];
  }
};
