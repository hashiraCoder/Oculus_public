export const tokenKeys = {
  all: ['developerTokens'] as const,
  lists: () => [...tokenKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...tokenKeys.lists(), workspaceId] as const,
  detail: (workspaceId: string, tokenId: string) => [...tokenKeys.list(workspaceId), tokenId] as const,
};
