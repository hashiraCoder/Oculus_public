import { useQuery } from '@tanstack/react-query';
import { analyticsRepository } from '../repositories/analytics.repository';
import { analyticsKeys } from '../api/analytics.keys';

// Read-only specific query configs
const retryConfig = {
  retry: 2,
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30000),
  refetchOnWindowFocus: false, // Don't refetch automatically on focus if using sockets
};

export const useSecurityPosture = (workspaceId: string | undefined) => {
  return useQuery({
    queryKey: analyticsKeys.posture(workspaceId!),
    queryFn: () => analyticsRepository.getSecurityPosture(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 30 * 1000, // 30s
    gcTime: 10 * 60 * 1000, // 10m
    ...retryConfig
  });
};

export const useWorkspaceSummary = (workspaceId: string | undefined) => {
  return useQuery({
    queryKey: analyticsKeys.summary(workspaceId!),
    queryFn: () => analyticsRepository.getWorkspaceSummary(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    ...retryConfig
  });
};

export const useRiskTrend = (workspaceId: string | undefined, days: number = 30) => {
  return useQuery({
    queryKey: analyticsKeys.trend(workspaceId!),
    queryFn: () => analyticsRepository.getRiskTrend(workspaceId!, days),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000, // 2m
    gcTime: 10 * 60 * 1000,
    ...retryConfig
  });
};

export const useFindingDistribution = (workspaceId: string | undefined) => {
  return useQuery({
    queryKey: analyticsKeys.distribution(workspaceId!),
    queryFn: () => analyticsRepository.getFindingDistribution(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 60 * 1000, // 1m
    gcTime: 10 * 60 * 1000,
    ...retryConfig
  });
};

export const useRepositoryRanking = (workspaceId: string | undefined) => {
  return useQuery({
    queryKey: analyticsKeys.repositories(workspaceId!),
    queryFn: () => analyticsRepository.getRepositoryRanking(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000, // 2m
    gcTime: 10 * 60 * 1000,
    ...retryConfig
  });
};

export const useDeveloperLeaderboard = (workspaceId: string | undefined) => {
  return useQuery({
    queryKey: analyticsKeys.leaderboard(workspaceId!),
    queryFn: () => analyticsRepository.getDeveloperLeaderboard(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5m
    gcTime: 30 * 60 * 1000, // 30m
    ...retryConfig
  });
};

export const useRecentScans = (workspaceId: string | undefined, limit: number = 5) => {
  return useQuery({
    queryKey: analyticsKeys.recentScans(workspaceId!, limit),
    queryFn: () => analyticsRepository.getRecentScans(workspaceId!, limit),
    enabled: !!workspaceId,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    ...retryConfig
  });
};
