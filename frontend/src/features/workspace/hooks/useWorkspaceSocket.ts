import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/socket/socketClient';
import { workspaceKeys } from '../api/workspace.keys';
import { repositoryKeys } from '@/features/repositories/api/repository.keys';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { formatNotification } from '@/features/notifications/formatters/notification.formatter';
export const useWorkspaceSocket = (workspaceId: string | undefined) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const setActiveWorkspace = useWorkspaceStore((state) => state.setActiveWorkspace);

  useEffect(() => {
    if (!workspaceId) return;

    const socket = getSocket();
    if (!socket) return;

    // Join workspace room for events
    socket.emit('join_workspace', workspaceId);

    const handleWorkspaceUpdated = () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    };

    const handleMemberAdded = () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });
      toast.info('A new member joined the workspace');
    };

    const handleMemberRemoved = (_data: { userId: string }) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });
    };

    const handleWorkspaceDeleted = () => {
      toast.error('This workspace has been deleted');
      setActiveWorkspace('');
      navigate('/login');
    };

    const handleGithubSyncStarted = () => {
      toast.info('Repository sync started in the background.');
      queryClient.invalidateQueries({ queryKey: repositoryKeys.list(workspaceId) });
    };

    const handleGithubSyncCompleted = () => {
      toast.success('Repository sync completed.');
      queryClient.invalidateQueries({ queryKey: repositoryKeys.list(workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
    };

    const handleRealtimeNotification = (payload: any) => {
      const addNotification = useNotificationsStore.getState().addNotification;
      const formatted = formatNotification(payload, workspaceId);
      addNotification(formatted);
    };

    socket.on('workspace_updated', handleWorkspaceUpdated);
    socket.on('member_added', handleMemberAdded);
    socket.on('member_removed', handleMemberRemoved);
    socket.on('workspace_deleted', handleWorkspaceDeleted);
    socket.on('github_sync_started', handleGithubSyncStarted);
    socket.on('github_sync_completed', handleGithubSyncCompleted);
    
    // Notification Events (from RedisPublisher)
    socket.on('SCAN_COMPLETED', handleRealtimeNotification);
    socket.on('SCAN_STARTED', handleRealtimeNotification);
    socket.on('SCAN_FAILED', handleRealtimeNotification);
    socket.on('SCAN_QUEUED', handleRealtimeNotification);
    socket.on('REPO_SYNC', handleRealtimeNotification);

    return () => {
      socket.emit('leave_workspace', workspaceId);
      socket.off('workspace_updated', handleWorkspaceUpdated);
      socket.off('member_added', handleMemberAdded);
      socket.off('member_removed', handleMemberRemoved);
      socket.off('workspace_deleted', handleWorkspaceDeleted);
      socket.off('github_sync_started', handleGithubSyncStarted);
      socket.off('github_sync_completed', handleGithubSyncCompleted);
      
      socket.off('SCAN_COMPLETED', handleRealtimeNotification);
      socket.off('SCAN_STARTED', handleRealtimeNotification);
      socket.off('SCAN_FAILED', handleRealtimeNotification);
      socket.off('SCAN_QUEUED', handleRealtimeNotification);
      socket.off('REPO_SYNC', handleRealtimeNotification);
    };
  }, [workspaceId, queryClient, navigate, setActiveWorkspace]);
};
