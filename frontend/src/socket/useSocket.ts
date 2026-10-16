import { useEffect, useState } from 'react';
import { connect, disconnect, getSocket } from './socketClient';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
      const socket = getSocket();
      
      if (socket) {
        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        
        setIsConnected(socket.connected);

        return () => {
          socket.off('connect', onConnect);
          socket.off('disconnect', onDisconnect);
          disconnect();
        };
      }
    } else {
      disconnect();
      setIsConnected(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const socket = getSocket();
    if (socket?.connected && activeWorkspaceId) {
      socket.emit('join_workspace', activeWorkspaceId);
      
      return () => {
        socket.emit('leave_workspace', activeWorkspaceId);
      };
    }
  }, [activeWorkspaceId, isConnected]);

  return { isConnected };
};
