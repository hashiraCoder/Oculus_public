import axiosInstance from '@/lib/axios';

export const developersApi = {
  getLeaderboard: async (wId: string) => {
    const res = await axiosInstance.get(`/analytics/${wId}/developers/leaderboard`);
    return res.data.data;
  }
};
