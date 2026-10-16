import { scanApi } from '../api/scanApi';
import type { ScanCardViewModel, ScanDetailViewModel, TimelineItemViewModel, TerminalLineViewModel } from '../types/scan.types';

const deriveIsError = (dto: any): boolean =>
  dto.conclusion === 'ERROR' ||
  (dto.status === 'COMPLETED' && !!dto.error_message && !dto.total_findings);

const deriveScanStatusColor = (dto: any): string => {
  if (dto.status === 'PASSED' && dto.conclusion !== 'ERROR') return 'text-green-500';
  if (dto.status === 'FAILED' || dto.conclusion === 'ERROR' || !!dto.error_message) return 'text-red-500';
  return 'text-blue-500';
};

export const scanRepository = {
  listScans: async (repositoryId: string, cursor?: string) => {
    const response = await scanApi.listScans(repositoryId, cursor);
    return {
      nextCursor: response.nextCursor,
      items: response.items.map((dto): ScanCardViewModel => ({
        id: dto.id,
        repositoryId: dto.repository_id,
        commitHash: dto.commit_hash || 'Unknown',
        status: dto.status,
        conclusion: dto.conclusion ?? null,
        startedAt: dto.started_at,
        totalFiles: dto.total_files,
        totalFindings: dto.total_findings,
        isCompleted: dto.status === 'PASSED' || dto.status === 'FAILED' || dto.status === 'COMPLETED' || dto.status === 'CANCELLED',
        isFailed: dto.status === 'FAILED' || (dto.status === 'COMPLETED' && !!dto.error_message),
        isError: deriveIsError(dto),
        statusColor: deriveScanStatusColor(dto)
      }))
    };
  },

  getScanDetails: async (scanId: string): Promise<ScanDetailViewModel> => {
    const dto = await scanApi.getScanDetails(scanId);
    return {
      id: dto.id,
      repositoryId: dto.repository_id,
      commitHash: dto.commit_hash || 'Unknown',
      status: dto.status,
      conclusion: dto.conclusion ?? null,
      startedAt: dto.started_at,
      totalFiles: dto.total_files,
      totalFindings: dto.total_findings,
      isCompleted: dto.status === 'PASSED' || dto.status === 'FAILED' || dto.status === 'COMPLETED' || dto.status === 'CANCELLED',
      isFailed: dto.status === 'FAILED' || (dto.status === 'COMPLETED' && !!dto.error_message),
      isError: deriveIsError(dto),
      statusColor: deriveScanStatusColor(dto),
      triggeredBy: dto.triggered_by,
      durationSeconds: dto.duration_ms ? Math.round(dto.duration_ms / 1000) : null,
      errorMessage: dto.error_message,
      cancelRequested: dto.cancel_requested,
      branch: dto.branch ?? null,
      prNumber: dto.pr_number ?? null,
    };
  },

  getScanTimeline: async (scanId: string): Promise<TimelineItemViewModel[]> => {
    const dtos = await scanApi.getScanTimeline(scanId);
    return dtos.map(dto => ({
      id: dto.id,
      type: dto.event_type,
      payload: dto.payload,
      time: dto.timestamp
    }));
  },

  getScanLogs: async (scanId: string): Promise<TerminalLineViewModel[]> => {
    const dtos = await scanApi.getScanLogs(scanId);
    return dtos.map(dto => ({
      id: dto.id,
      level: dto.level,
      text: dto.message,
      time: dto.timestamp
    }));
  },

  cancelScan: async (scanId: string) => {
    return scanApi.cancelScan(scanId);
  },

  retryScan: async (scanId: string) => {
    return scanApi.retryScan(scanId);
  }
};
