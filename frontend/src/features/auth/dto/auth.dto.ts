export interface UserDTO {
  id: string;
  email: string;
  name?: string;
  role?: string;
  global_role?: string;
  is_verified: boolean;
  token_version?: number;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkspaceDTO {
  id: string;
  name: string;
  role?: string;
  type?: string;
  github_installation_id?: string | null;
  github_account_login?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponseDTO {
  user: UserDTO;
  workspaces: WorkspaceDTO[];
  accessToken: string;
}


