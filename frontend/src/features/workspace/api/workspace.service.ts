import axiosInstance from '@/lib/axios';
import type { WorkspaceResponseDTO, WorkspaceMembersResponseDTO } from '../dto/workspace.dto';

class WorkspaceApiService {
  static async getUserWorkspaces(): Promise<WorkspaceResponseDTO> {
    const response = await axiosInstance.get('/workspaces');
    return response.data;
  }

  static async getWorkspaceById(id: string): Promise<WorkspaceResponseDTO> {
    const response = await axiosInstance.get(`/workspaces/${id}`);
    return response.data;
  }

  static async getWorkspaceMembers(id: string): Promise<WorkspaceMembersResponseDTO> {
    const response = await axiosInstance.get(`/workspaces/${id}/members`);
    return response.data;
  }

  static async updateWorkspace(id: string, name: string) {
    const response = await axiosInstance.patch(`/workspaces/${id}`, { name });
    return response.data;
  }

  static async deleteWorkspace(id: string) {
    const response = await axiosInstance.delete(`/workspaces/${id}`);
    return response.data;
  }
}

export default WorkspaceApiService;
