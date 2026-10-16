import axiosInstance from '@/lib/axios';
import type { ScanSummaryDTO, ScanDetailDTO, ScanTimelineDTO, ScanLogDTO, ScanGateStatusDTO } from '../dto/scan.dto';
import type { PaginatedResponse } from '@/types/api.types';

export interface TriggerScanRequest {
  repositoryId: string;
  commitSha?: string;
  branch?: string;
  triggerSource?: string;
}

export interface TriggerScanResponse {
  success: boolean;
  message: string;
  scanId: string;
}

export const scanApi = {
  triggerScan: async (request: TriggerScanRequest): Promise<TriggerScanResponse> => {
    const { data } = await axiosInstance.post('/scans', request);
    return data.data;
  },

  listScans: async (repositoryId: string, cursor?: string, limit = 50): Promise<PaginatedResponse<ScanSummaryDTO>> => {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());
    const { data } = await axiosInstance.get(`/pagination/scans/${repositoryId}?${params.toString()}`);
    return data.data; // Unwrap ApiResponse
  },

  getScanDetails: async (scanId: string): Promise<ScanDetailDTO> => {
    const { data } = await axiosInstance.get(`/scans/${scanId}`);
    return data.data; // Unwrap ApiResponse
  },

  getScanTimeline: async (scanId: string): Promise<ScanTimelineDTO[]> => {
    const { data } = await axiosInstance.get(`/scans/${scanId}/timeline`);
    return data.data;
  },

  getScanLogs: async (scanId: string): Promise<ScanLogDTO[]> => {
    const { data } = await axiosInstance.get(`/scans/${scanId}/logs`);
    return data.data;
  },

  cancelScan: async (scanId: string): Promise<void> => {
    await axiosInstance.post(`/scans/${scanId}/cancel`);
  },

  retryScan: async (scanId: string): Promise<void> => {
    await axiosInstance.post(`/scans/${scanId}/retry`);
  },

  getScanGateStatus: async (scanId: string): Promise<ScanGateStatusDTO> => {
    const { data } = await axiosInstance.get(`/scans/${scanId}/gate`);
    // The gate endpoint returns the object directly (not wrapped in ApiResponse)
    return data;
  }
};
