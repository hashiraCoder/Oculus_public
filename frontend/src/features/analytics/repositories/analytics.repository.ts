import { analyticsApi } from '../api/analyticsApi';
import { analyticsMapper } from '../mappers/analytics.mapper';
import type { 
  SecurityPostureViewModel,
  WorkspaceSummaryViewModel,
  RiskTrendPointViewModel,
  FindingDistributionViewModel,
  RepositoryRankingViewModel,
  DeveloperScoreViewModel
} from '../types/analytics.types';

export const analyticsRepository = {
  getSecurityPosture: async (workspaceId: string): Promise<SecurityPostureViewModel> => {
    const dto = await analyticsApi.getSecurityPosture(workspaceId);
    return analyticsMapper.toSecurityPosture(dto);
  },

  getWorkspaceSummary: async (workspaceId: string): Promise<WorkspaceSummaryViewModel> => {
    const dto = await analyticsApi.getWorkspaceSummary(workspaceId);
    return analyticsMapper.toWorkspaceSummary(dto);
  },

  getRiskTrend: async (workspaceId: string, days: number = 30): Promise<RiskTrendPointViewModel[]> => {
    const dtos = await analyticsApi.getRiskTrend(workspaceId, days);
    return analyticsMapper.toRiskTrend(dtos);
  },

  getFindingDistribution: async (workspaceId: string): Promise<FindingDistributionViewModel[]> => {
    const dtos = await analyticsApi.getFindingDistribution(workspaceId);
    return analyticsMapper.toFindingDistribution(dtos);
  },

  getRepositoryRanking: async (workspaceId: string): Promise<RepositoryRankingViewModel> => {
    const dto = await analyticsApi.getRepositoryRanking(workspaceId);
    return analyticsMapper.toRepositoryRanking(dto);
  },

  getDeveloperLeaderboard: async (workspaceId: string): Promise<DeveloperScoreViewModel[]> => {
    const dtos = await analyticsApi.getDeveloperLeaderboard(workspaceId);
    return dtos.map(analyticsMapper.toDeveloperScore);
  },

  getRecentScans: async (workspaceId: string, limit: number = 5): Promise<any[]> => {
    return analyticsApi.getRecentScans(workspaceId, limit);
  }
};
