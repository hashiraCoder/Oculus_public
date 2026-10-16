import api from '@/lib/axios';
import type { 
  EngineHealth, 
  WorkerLease, 
  QueueStatus, 
  AdminScan, 
  ScanStageTelemetry,
  EngineAlert,
  ShadowResult,
  PromotionGateResult
} from '../types';

export const adminApi = {
  getHealth: async (): Promise<EngineHealth> => {
    const res = await api.get('/admin/health');
    return res.data.data;
  },

  getWorkers: async (): Promise<WorkerLease[]> => {
    const res = await api.get('/admin/workers');
    return res.data.data;
  },

  getQueues: async (): Promise<QueueStatus> => {
    const res = await api.get('/admin/queues');
    return res.data.data;
  },

  getScans: async (params?: { status?: string; limit?: number; offset?: number }): Promise<AdminScan[]> => {
    const res = await api.get('/admin/scans', { params });
    return res.data.data;
  },

  getScanTelemetry: async (scanId: string): Promise<ScanStageTelemetry[]> => {
    const res = await api.get(`/admin/scans/${scanId}/telemetry`);
    return res.data.data;
  },

  getRules: async (): Promise<any> => {
    const res = await api.get('/admin/rules');
    return res.data.data;
  },

  getAlerts: async (): Promise<EngineAlert[]> => {
    const res = await api.get('/admin/alerts');
    return res.data.data;
  },

  resolveAlert: async (id: string, resolutionNote: string): Promise<void> => {
    await api.post(`/admin/alerts/${id}/resolve`, { resolutionNote });
  },

  getShadowResults: async (params?: { limit?: number; offset?: number }): Promise<{ data: ShadowResult[]; total: number }> => {
    const res = await api.get('/admin/shadow', { params });
    return { data: res.data.data, total: res.data.total };
  },

  getShadowDetails: async (id: string): Promise<ShadowResult> => {
    const res = await api.get(`/admin/shadow/${id}`);
    return res.data.data;
  },

  getPromotionGate: async (): Promise<PromotionGateResult> => {
    const res = await api.get('/admin/shadow/promotion-gate');
    return res.data.data;
  },
};
