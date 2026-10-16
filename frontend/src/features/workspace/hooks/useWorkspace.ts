import { useQuery } from '@tanstack/react-query';
import { WorkspaceRepository } from '../repositories/workspace.repository';
import type { WorkspaceViewModel, WorkspaceMemberViewModel } from '../types/workspace.types';
import { workspaceKeys } from '../api/workspace.keys';

export const useWorkspaces = () => {
  return useQuery<WorkspaceViewModel[], Error>({
    queryKey: workspaceKeys.lists(),
    queryFn: () => WorkspaceRepository.getUserWorkspaces(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useWorkspace = (id: string | undefined) => {
  return useQuery<WorkspaceViewModel, Error>({
    queryKey: id ? workspaceKeys.detail(id) : workspaceKeys.details(),
    queryFn: () => WorkspaceRepository.getWorkspaceById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useWorkspaceMembers = (id: string | undefined) => {
  return useQuery<WorkspaceMemberViewModel[], Error>({
    queryKey: id ? workspaceKeys.members(id) : [...workspaceKeys.details(), 'members'],
    queryFn: () => WorkspaceRepository.getWorkspaceMembers(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
