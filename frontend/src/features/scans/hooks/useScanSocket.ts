import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { scanKeys } from '../api/scan.keys';
import type { TerminalLineViewModel, TimelineItemViewModel } from '../types/scan.types';
import { useAuthStore } from '@/features/auth/stores/authStore';

export const useScanSocket = (workspaceId: string, scanId: string) => {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const { accessToken: token } = useAuthStore(); // needed for auth refresh

  useEffect(() => {
    if (!workspaceId || !scanId || !token) return;

    
    const rootUrl = import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '');
    const socket = io(rootUrl, {
      auth: { token },
      query: { workspaceId, scanId },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      timeout: 20000,
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected to Workspace Notifications');
      socket.emit('join_workspace', workspaceId);
      // Request missed logs if implemented
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection Error:', err.message);
      // Could trigger token refresh if error is auth related
    });

    // 1. scan_log -> Optimistic Append to logs query key
    socket.on('oculus.scan.log', (payload: any) => {
      const newLine: TerminalLineViewModel = {
        id: Math.random().toString(36).substr(2, 9),
        level: payload.level || 'info',
        text: payload.message,
        time: new Date().toISOString()
      };

      queryClient.setQueryData(scanKeys.logs(scanId), (oldData: TerminalLineViewModel[] | undefined) => {
        if (!oldData) return [newLine];
        // Keep last 5000 in memory to prevent ballooning
        const newData = [...oldData, newLine];
        return newData.length > 5000 ? newData.slice(newData.length - 5000) : newData;
      });
    });

    // 2. scan_progress -> Optimistic Append to timeline
    socket.on('oculus.scan.progress', (payload: any) => {
      const newEvent: TimelineItemViewModel = {
        id: Math.random().toString(36).substr(2, 9),
        type: payload.event_type,
        payload: payload.payload,
        time: new Date().toISOString()
      };

      queryClient.setQueryData(scanKeys.timeline(scanId), (oldData: TimelineItemViewModel[] | undefined) => {
        if (!oldData) return [newEvent];
        return [...oldData, newEvent];
      });
    });

    // 3. scan_completed / scan_failed / scan_cancelled -> Hard invalidation
    const invalidateAll = (payload: any) => {
      console.log('[Socket] Scan state changed', payload);
      queryClient.invalidateQueries({ queryKey: scanKeys.detail(scanId) });
      queryClient.invalidateQueries({ queryKey: scanKeys.timeline(scanId) });
      queryClient.invalidateQueries({ queryKey: scanKeys.logs(scanId) });
      queryClient.invalidateQueries({ queryKey: scanKeys.findings(scanId) });
      queryClient.invalidateQueries({ queryKey: scanKeys.lists() });
    };

    socket.on('oculus.scan.started', invalidateAll);
    socket.on('oculus.scan.completed', invalidateAll);
    socket.on('oculus.scan.failed', invalidateAll);
    socket.on('oculus.scan.cancelled', invalidateAll);

    return () => {
      socket.disconnect();
    };
  }, [workspaceId, scanId, queryClient, token]);
};
