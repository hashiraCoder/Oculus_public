export const repositoryKeys = {
  all: () => ['repositories'] as const,
  lists: () => [...repositoryKeys.all(), 'list'] as const,
  list: (workspaceId: string) => [...repositoryKeys.lists(), workspaceId] as const,
  dropdown: (workspaceId: string) => [...repositoryKeys.all(), 'dropdown', workspaceId] as const,
  detail: (id: string) => [...repositoryKeys.all(), 'detail', id] as const,
  riskTrend: (workspaceId: string) => [...repositoryKeys.all(), 'risk-trend', workspaceId] as const,
};
