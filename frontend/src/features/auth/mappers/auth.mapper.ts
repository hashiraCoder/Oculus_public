import { formatDistanceToNow } from 'date-fns';
import type { UserDTO, WorkspaceDTO, AuthResponseDTO } from '../dto/auth.dto';
import type { UserViewModel, WorkspaceViewModel, AuthViewModel } from '../types/auth.types';

export const mapUserToViewModel = (dto: UserDTO): UserViewModel => {
  const roleRaw = dto.role || dto.global_role || 'User';
  return {
    id: dto.id,
    email: dto.email,
    name: dto.name || dto.email.split('@')[0],
    initials: (dto.name || dto.email).substring(0, 2).toUpperCase(),
    role: roleRaw.charAt(0).toUpperCase() + roleRaw.slice(1).toLowerCase(),
    isVerified: dto.is_verified,
    lastLoginFormatted: dto.last_login 
      ? formatDistanceToNow(new Date(dto.last_login), { addSuffix: true }) 
      : 'Never'
  };
};

export const mapWorkspaceToViewModel = (dto: WorkspaceDTO): WorkspaceViewModel => {
  return {
    id: dto.id,
    name: dto.name,
    initials: dto.name.substring(0, 2).toUpperCase(),
    type: dto.type || 'Standard',
    isGithubConnected: !!dto.github_installation_id,
    githubAccount: dto.github_account_login || null
  };
};

export const mapAuthResponseToViewModel = (dto: AuthResponseDTO): AuthViewModel => {
  return {
    user: mapUserToViewModel(dto.user),
    workspaces: dto.workspaces.map(mapWorkspaceToViewModel),
    accessToken: dto.accessToken
  };
};
