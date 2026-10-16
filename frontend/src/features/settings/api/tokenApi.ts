import axiosInstance from '@/lib/axios';

export interface DeveloperToken {
    id: string;
    name: string;
    token_prefix: string;
    scopes: string[];
    last_used_at: string | null;
    expires_at: string | null;
    revoked_at: string | null;
    created_at: string;
}

export const tokenApi = {
    listTokens: async (workspaceId: string): Promise<DeveloperToken[]> => {
        const res = await axiosInstance.get(`/workspaces/${workspaceId}/tokens`);
        return res.data;
    },
    createToken: async (workspaceId: string, name: string, scopes: string[], expiresAt: string | null) => {
        const payload: any = { name, scopes };
        if (expiresAt) {
            payload.expiresAt = expiresAt;
        } else if (expiresAt === null) {
            payload.expiresAt = 'never';
        }
        const res = await axiosInstance.post(`/workspaces/${workspaceId}/tokens`, payload);
        return res.data; // Contains { id, name, token_prefix, token, ... }
    },
    revokeToken: async (workspaceId: string, tokenId: string) => {
        const res = await axiosInstance.post(`/workspaces/${workspaceId}/tokens/${tokenId}/revoke`);
        return res.data;
    },
    rotateToken: async (workspaceId: string, tokenId: string) => {
        const res = await axiosInstance.post(`/workspaces/${workspaceId}/tokens/${tokenId}/rotate`);
        return res.data; // Returns new token plaintext
    }
};
