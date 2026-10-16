import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { analyticsKeys } from '../api/analytics.keys';
import { useAuthStore } from '@/features/auth/stores/authStore';

export const useAnalyticsSocket = (workspaceId: string) => {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const { accessToken: token } = useAuthStore();

  useEffect(() => {
    if (!workspaceId || !token) return;

    const rootUrl = import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '');
    const socket = io(rootUrl, {
      auth: { token },
      query: { workspaceId },
      reconnection: true,
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[AnalyticsSocket] Connected to Notifications');
      socket.emit('join_workspace', workspaceId);
    });

    // 1. Dashboard Summary Updated -> Invalidate Summary and Posture
    socket.on('dashboard.summary.updated', (payload: any) => {
      console.log('[AnalyticsSocket] dashboard.summary.updated', payload);
      queryClient.invalidateQueries({ queryKey: analyticsKeys.summary(workspaceId) });
      queryClient.invalidateQueries({ queryKey: analyticsKeys.posture(workspaceId) });
    });

    // 2. Finding Updated -> Invalidate Distribution
    socket.on('finding.updated', (payload: any) => {
      console.log('[AnalyticsSocket] finding.updated', payload);
      queryClient.invalidateQueries({ queryKey: analyticsKeys.distribution(workspaceId) });
    });

    // 3. Repository Updated -> Invalidate Repository Ranking
    socket.on('repository.updated', (payload: any) => {
      console.log('[AnalyticsSocket] repository.updated', payload);
      queryClient.invalidateQueries({ queryKey: analyticsKeys.repositories(workspaceId) });
    });

    // 4. Developer Score Updated (Future Capability) -> Invalidate Leaderboard
    socket.on('developer.score.updated', (payload: any) => {
      console.log('[AnalyticsSocket] developer.score.updated', payload);
      queryClient.invalidateQueries({ queryKey: analyticsKeys.leaderboard(workspaceId) });
    });

    return () => {
      socket.disconnect();
    };
  }, [workspaceId, queryClient, token]);
};
