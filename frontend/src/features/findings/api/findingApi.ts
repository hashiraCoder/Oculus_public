import axiosInstance from '@/lib/axios';
import type { 
  FindingsPaginatedResponse, 
  FindingAuditDTO, 
  UpdateFindingStatusDTO,
  BulkUpdateFindingStatusDTO,
  FingerprintHistoryDTO
} from '../dto/finding.dto';

export const findingApi = {
  listWorkspaceFindings: async (
    workspaceId: string,
    params: Record<string, string>
  ): Promise<FindingsPaginatedResponse> => {
    const searchParams = new URLSearchParams(params);
    const { data } = await axiosInstance.get(`/findings/${workspaceId}?${searchParams.toString()}`);
    return data.data; // Assuming ApiResponse structure
  },

  getAuditHistory: async (workspaceId: string, findingId: string): Promise<FindingAuditDTO[]> => {
    const { data } = await axiosInstance.get(`/findings/${workspaceId}/${findingId}/audit`);
    return data.data;
  },

  updateStatus: async (
    workspaceId: string, 
    findingId: string, 
    payload: UpdateFindingStatusDTO
  ) => {
    const { data } = await axiosInstance.patch(`/findings/${workspaceId}/${findingId}/status`, payload);
    return data;
  },

  bulkUpdateStatus: async (
    workspaceId: string, 
    payload: BulkUpdateFindingStatusDTO
  ) => {
    const { data } = await axiosInstance.patch(`/findings/${workspaceId}/bulk-status`, payload);
    return data;
  },

  getFingerprintHistory: async (workspaceId: string, fingerprint: string): Promise<FingerprintHistoryDTO[]> => {
    const { data } = await axiosInstance.get(`/findings/${workspaceId}/fingerprint/${encodeURIComponent(fingerprint)}/history`);
    return data.data;
  }
};
