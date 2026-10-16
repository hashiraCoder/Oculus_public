import { useMutation, useQueryClient } from '@tanstack/react-query';
import { githubApi } from '../api/githubApi';
import { workspaceKeys } from '../../workspace/api/workspace.keys';
import { repositoryKeys } from '../../repositories/api/repository.keys';
import { toast } from 'sonner';
import type { 
  GithubConnectRequestDTO, 
  GithubDisconnectRequestDTO, 
  GithubSyncRequestDTO 
} from '../dto/github.dto';

export const useConnectGithub = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GithubConnectRequestDTO) => githubApi.connectGithub(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(variables.workspaceId) });
      toast.success('GitHub App connected successfully!');
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      if (status === 403) {
        toast.error('Only workspace owners can connect GitHub.');
      } else if (status === 422) {
        toast.error('Invalid installation ID from GitHub.');
      } else {
        toast.error(error?.response?.data?.message || 'Failed to connect GitHub App.');
      }
    }
  });
};

export const useDisconnectGithub = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GithubDisconnectRequestDTO) => githubApi.disconnectGithub(data),
    onSuccess: (_, variables) => {
      // Invalidate workspace to drop hasGithubConnection
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(variables.workspaceId) });
      // Invalidate repositories since they belong to the disconnected connection
      queryClient.invalidateQueries({ queryKey: repositoryKeys.lists() });
      toast.success('GitHub App disconnected successfully!');
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      if (status === 403) {
        toast.error('Only workspace owners can disconnect GitHub.');
      } else {
        toast.error(error?.response?.data?.message || 'Failed to disconnect GitHub App.');
      }
    }
  });
};

export const useSyncGithub = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GithubSyncRequestDTO) => githubApi.syncGithub(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(variables.workspaceId) });
      queryClient.invalidateQueries({ queryKey: repositoryKeys.lists() });
      toast.info('Repository sync queued successfully.');
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      if (status === 429) {
        toast.error('GitHub rate limit reached. Sync deferred.');
      } else {
        toast.error(error?.response?.data?.message || 'Failed to trigger repository sync.');
      }
    }
  });
};
