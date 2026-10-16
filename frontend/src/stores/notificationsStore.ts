import { create } from 'zustand';
import { notificationsApi } from '@/features/notifications/api/notificationsApi';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
  actionLabel?: string;
  actionUrl?: string;
  metadata?: any;
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (workspaceId: string, id: string) => Promise<void>;
  markAllAsRead: (workspaceId: string) => Promise<void>;
  clearAll: () => void;
  setNotifications: (notifications: Notification[]) => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (notification) => set((state) => {
    // Deduplication logic: prevent exact same event for same scanId/repoId
    if (notification.metadata?.scanId) {
      const isDuplicate = state.notifications.some(
        n => n.type === notification.type && n.metadata?.scanId === notification.metadata?.scanId
      );
      if (isDuplicate) return state; // Ignore duplicate
    }
    
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      read: false,
    };
    return {
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    };
  }),
  markAsRead: async (workspaceId, id) => {
    await notificationsApi.markAsRead(workspaceId, id);
    set((state) => {
    const notifications = state.notifications.map(n => 
      n.id === id && !n.read ? { ...n, read: true } : n
    );
    return {
      notifications,
      unreadCount: notifications.filter(n => !n.read).length
    };
    });
  },
  markAllAsRead: async (workspaceId) => {
    await notificationsApi.markAllAsRead(workspaceId);
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0
    }));
  },
  clearAll: () => set({ notifications: [], unreadCount: 0 }),
  setNotifications: (notifications) => set({ 
    notifications,
    unreadCount: notifications.filter(n => !n.read).length
  }),
}));
