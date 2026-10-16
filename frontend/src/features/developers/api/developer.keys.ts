export const developerKeys = {
  all: () => ['developers'] as const,
  leaderboard: (workspaceId: string) => [...developerKeys.all(), 'leaderboard', workspaceId] as const,
};
