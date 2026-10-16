import type { FindingFilters } from '../types/finding.types';

export const findingKeys = {
  all: () => ['findings'] as const,
  lists: () => [...findingKeys.all(), 'list'] as const,
  list: (workspaceId: string, filters: FindingFilters) => [...findingKeys.lists(), workspaceId, filters] as const,
  detail: (workspaceId: string, id: string) => [...findingKeys.all(), 'detail', workspaceId, id] as const,
  audit: (workspaceId: string, id: string) => [...findingKeys.all(), 'audit', workspaceId, id] as const,
  history: (workspaceId: string, fingerprint: string) => [...findingKeys.all(), 'history', workspaceId, fingerprint] as const,
};
