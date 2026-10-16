export interface WorkspaceDTO {
  id: string;
  name: string;
  type: string;
  github_installation_id: string | null;
  hasGithubConnection?: boolean;
  githubAccountLogin?: string | null;
  githubSyncStatus?: 'PENDING' | 'SYNCING' | 'READY' | 'FAILED' | null;
  role?: string;
  joined_at?: string;
  created_at?: string;
}

export interface WorkspaceResponseDTO {
  success: boolean;
  message: string;
  data: WorkspaceDTO | WorkspaceDTO[];
}

export interface WorkspaceMemberDTO {
  id: string;
  email: string;
  name: string;
  role: string;
  joined_at: string;
}

export interface WorkspaceMembersResponseDTO {
  success: boolean;
  message: string;
  data: WorkspaceMemberDTO[];
}
