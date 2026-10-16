export interface UserViewModel {
  id: string;
  email: string;
  name: string;
  initials: string;
  role: string;
  isVerified: boolean;
  lastLoginFormatted: string;
}

export interface WorkspaceViewModel {
  id: string;
  name: string;
  initials: string;
  type: string;
  isGithubConnected: boolean;
  githubAccount: string | null;
}

export interface AuthViewModel {
  user: UserViewModel;
  workspaces: WorkspaceViewModel[];
  accessToken: string;
}
