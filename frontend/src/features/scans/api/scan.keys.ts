export const scanKeys = {
  all: () => ['scans'] as const,
  lists: () => [...scanKeys.all(), 'list'] as const,
  list: (repoId: string) => [...scanKeys.lists(), repoId] as const,
  detail: (id: string) => [...scanKeys.all(), 'detail', id] as const,
  timeline: (id: string) => [...scanKeys.all(), 'timeline', id] as const,
  logs: (id: string) => [...scanKeys.all(), 'logs', id] as const,
  metrics: (id: string) => [...scanKeys.all(), 'metrics', id] as const,
  findings: (id: string) => [...scanKeys.all(), 'findings', id] as const,
  gate: (id: string) => [...scanKeys.all(), 'gate', id] as const,
};
