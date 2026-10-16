import type { WorkspaceDTO, WorkspaceMemberDTO } from '../dto/workspace.dto';
import type { WorkspaceViewModel, WorkspaceMemberViewModel } from '../types/workspace.types';
import { formatDistanceToNow } from 'date-fns';

export const mapWorkspaceDtoToViewModel = (dto: WorkspaceDTO): WorkspaceViewModel => {
  return {
    id: dto.id,
    name: dto.name,
    type: (dto.type as 'PERSONAL' | 'TEAM' | 'ENTERPRISE') || 'PERSONAL',
    hasGithubConnection: dto.hasGithubConnection !== undefined ? dto.hasGithubConnection : !!dto.github_installation_id,
    githubAccountLogin: dto.githubAccountLogin || null,
    githubSyncStatus: dto.githubSyncStatus || null,
    role: dto.role || null,
    joinedAt: dto.joined_at ? new Date(dto.joined_at) : null,
    createdAt: dto.created_at ? new Date(dto.created_at) : null,
  };
};

export const mapWorkspaceListDtoToViewModel = (dtos: WorkspaceDTO[]): WorkspaceViewModel[] => {
  return dtos.map(mapWorkspaceDtoToViewModel);
};

export const mapWorkspaceMemberDtoToViewModel = (dto: WorkspaceMemberDTO): WorkspaceMemberViewModel => {
  return {
    id: dto.id,
    email: dto.email,
    name: dto.name || dto.email.split('@')[0],
    initials: (dto.name || dto.email).substring(0, 2).toUpperCase(),
    role: dto.role.charAt(0).toUpperCase() + dto.role.slice(1).toLowerCase(),
    joinedAtFormatted: dto.joined_at 
      ? formatDistanceToNow(new Date(dto.joined_at), { addSuffix: true }) 
      : 'Unknown'
  };
};

export const mapWorkspaceMemberListDtoToViewModel = (dtos: WorkspaceMemberDTO[]): WorkspaceMemberViewModel[] => {
  return dtos.map(mapWorkspaceMemberDtoToViewModel);
};
