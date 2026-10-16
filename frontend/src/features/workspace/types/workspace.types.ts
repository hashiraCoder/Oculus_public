export interface WorkspaceViewModel {
  id: string;
  name: string;
  type: 'PERSONAL' | 'TEAM' | 'ENTERPRISE';
  hasGithubConnection: boolean;
  githubAccountLogin: string | null;
  githubSyncStatus: 'PENDING' | 'SYNCING' | 'READY' | 'FAILED' | null;
  role: string | null;
  joinedAt: Date | null;
  createdAt: Date | null;
}

export interface WorkspaceMemberViewModel {
  id: string;
  email: string;
  name: string;
  initials: string;
  role: string;
  joinedAtFormatted: string;
}
