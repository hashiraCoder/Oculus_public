import { findingApi } from '../api/findingApi';
import type { FindingFilters, FindingRowViewModel, AuditLogViewModel } from '../types/finding.types';
import type { FindingStatus } from '../types/finding.types';

export const findingRepository = {
  listWorkspaceFindings: async (workspaceId: string, filters: FindingFilters, cursor?: string) => {
    const params: Record<string, string> = {};
    if (cursor) params.cursor = cursor;
    if (filters.repositoryId) params.repositoryId = filters.repositoryId;
    if (filters.severity) params.severity = filters.severity;
    if (filters.status) params.status = filters.status;
    if (filters.rule) params.rule = filters.rule;
    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.fromDate) params.fromDate = filters.fromDate;
    if (filters.toDate) params.toDate = filters.toDate;
    
    // Add default limit
    params.limit = '50';

    const response = await findingApi.listWorkspaceFindings(workspaceId, params);
    
    return {
      nextCursor: response.nextCursor,
      items: response.items.map((dto): FindingRowViewModel => ({
        id: dto.id,
        ruleType: dto.rule_type,
        engine: dto.engine,
        severity: dto.severity as FindingRowViewModel['severity'],
        filePath: dto.file_path,
        lineNumber: dto.line_number,
        snippet: dto.snippet,
        confidenceScore: dto.confidence_score,
        introducedBy: dto.introduced_by,
        fingerprint: dto.fingerprint,
        status: dto.status as FindingStatus,
        createdAt: dto.created_at,
        repositoryName: dto.repo_name,
        repositoryId: dto.repo_id
      }))
    };
  },

  getAuditHistory: async (workspaceId: string, findingId: string): Promise<AuditLogViewModel[]> => {
    const dtos = await findingApi.getAuditHistory(workspaceId, findingId);
    return (dtos ?? []).map(dto => ({
      id: dto.id,
      oldStatus: dto.old_status,
      newStatus: dto.new_status,
      comment: dto.comment,
      createdAt: dto.created_at,
      changedBy: dto.changed_by_email || 'System'
    }));
  },

  updateStatus: async (workspaceId: string, findingId: string, status: FindingStatus, comment?: string) => {
    return findingApi.updateStatus(workspaceId, findingId, { status, comment });
  },

  bulkUpdateStatus: async (workspaceId: string, findingIds: string[], status: FindingStatus, comment?: string) => {
    return findingApi.bulkUpdateStatus(workspaceId, { findingIds, status, comment });
  }
};
