import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { repositoryApi } from '../api/repositoryApi';
import { repositoryKeys } from '../api/repository.keys';

export const useRepositories = (workspaceId: string) => {
  return useInfiniteQuery({
    queryKey: repositoryKeys.list(workspaceId),
    queryFn: ({ pageParam }) => repositoryApi.listRepositories(workspaceId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!workspaceId,
  });
};

export const useWorkspaceRiskTrend = (workspaceId: string) => {
  return useQuery({
    queryKey: repositoryKeys.riskTrend(workspaceId),
    queryFn: () => repositoryApi.getWorkspaceRiskTrend(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useRepositoryRiskTrend = (workspaceId: string, repositoryId: string) => {
  return useQuery({
    queryKey: repositoryKeys.riskTrend(`${workspaceId}:${repositoryId}`),
    queryFn: () => repositoryApi.getRepositoryRiskTrend(workspaceId, repositoryId),
    enabled: !!workspaceId && !!repositoryId,
  });
};
