export const analyticsKeys = {
  all: () => ['analytics'] as const,
  workspace: (id: string) => [...analyticsKeys.all(), id] as const,
  summary: (id: string) => [...analyticsKeys.workspace(id), 'summary'] as const,
  posture: (id: string) => [...analyticsKeys.workspace(id), 'posture'] as const,
  trend: (id: string) => [...analyticsKeys.workspace(id), 'trend'] as const,
  distribution: (id: string) => [...analyticsKeys.workspace(id), 'distribution'] as const,
  repositories: (id: string) => [...analyticsKeys.workspace(id), 'repositories'] as const,
  leaderboard: (id: string) => [...analyticsKeys.workspace(id), 'leaderboard'] as const,
  recentScans: (id: string, limit: number) => [...analyticsKeys.workspace(id), 'recentScans', limit] as const,
};
