export interface GithubConnectRequestDTO {
  workspaceId: string;
  installationId: string;
}

export interface GithubDisconnectRequestDTO {
  workspaceId: string;
}

export interface GithubSyncRequestDTO {
  workspaceId: string;
  installationId: string | null;
}

export interface GithubResponseDTO {
  success: boolean;
  message: string;
  data: any;
}
