import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { findingKeys } from '../api/finding.keys';
import { useAuthStore } from '@/features/auth/stores/authStore';

export const useFindingsSocket = (workspaceId: string) => {
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
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected to Workspace Notifications');
      socket.emit('join_workspace', workspaceId);
    });

    // 1. Scan completed -> Soft invalidate list so it fetches newly discovered findings
    socket.on('oculus.scan.completed', (payload: any) => {
      console.log('[Socket] Scan completed, invalidating finding lists', payload);
      queryClient.invalidateQueries({ queryKey: findingKeys.lists() });
    });

    // 2. Finding updated -> Invalidate specific finding detail and audit log
    socket.on('finding.updated', (payload: any) => {
      console.log('[Socket] Finding updated', payload);
      const { findingId, status } = payload;
      
      // Update lists optimistically if present
      queryClient.setQueriesData({ queryKey: findingKeys.lists() }, (oldData: any) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            items: page.items.map((finding: any) => 
              finding.id === findingId ? { ...finding, status } : finding
            )
          }))
        };
      });

      // Invalidate detail and audit to fetch latest
      queryClient.invalidateQueries({ queryKey: findingKeys.detail(workspaceId, findingId) });
      queryClient.invalidateQueries({ queryKey: findingKeys.audit(workspaceId, findingId) });
    });

    return () => {
      socket.disconnect();
    };
  }, [workspaceId, queryClient, token]);
};
