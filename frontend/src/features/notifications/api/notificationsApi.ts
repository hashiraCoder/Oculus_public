import axiosInstance from '@/lib/axios';

export const notificationsApi = {
  getNotifications: async (workspaceId: string) => {
    const res = await axiosInstance.get(`/workspaces/${workspaceId}/notifications?limit=50`);
    return res.data;
  },
  markAsRead: async (workspaceId: string, notificationId: string) => {
    await axiosInstance.patch(`/workspaces/${workspaceId}/notifications/${notificationId}/read`);
  },
  markAllAsRead: async (workspaceId: string) => {
    await axiosInstance.post(`/workspaces/${workspaceId}/notifications/mark-all-read`);
  }
};
