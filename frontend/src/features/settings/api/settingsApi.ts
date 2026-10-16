import axiosInstance from '@/lib/axios';

export const settingsApi = {
  getRiskPolicies: async (wId: string) => {
    const res = await axiosInstance.get(`/workspaces/${wId}/policies/risk-weights`);
    return res.data?.data ?? { weights: { critical: 40, high: 20, medium: 5, low: 1 } };
  },
  updateRiskPolicy: async (wId: string, policyType: string, config: Record<string, number>) => {
    const res = await axiosInstance.put(`/workspaces/${wId}/policies/${policyType}`, config);
    return res.data?.data ?? { weights: config };
  },
  syncGithub: async (wId: string) => {
    const res = await axiosInstance.post(`/github/sync`, { workspaceId: wId });
    return res.data;
  },
  disconnectGithub: async (wId: string) => {
    const res = await axiosInstance.delete(`/github/disconnect`, { data: { workspaceId: wId } });
    return res.data;
  }
};
