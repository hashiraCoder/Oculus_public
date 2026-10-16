import WorkspaceApiService from '../api/workspace.service';
import type { WorkspaceDTO, WorkspaceMemberDTO } from '../dto/workspace.dto';
import { mapWorkspaceDtoToViewModel, mapWorkspaceListDtoToViewModel, mapWorkspaceMemberListDtoToViewModel } from '../mappers/workspace.mapper';
import type { WorkspaceViewModel, WorkspaceMemberViewModel } from '../types/workspace.types';

export class WorkspaceRepository {
  static async getUserWorkspaces(): Promise<WorkspaceViewModel[]> {
    const response = await WorkspaceApiService.getUserWorkspaces();
    return mapWorkspaceListDtoToViewModel(response.data as WorkspaceDTO[]);
  }

  static async getWorkspaceById(id: string): Promise<WorkspaceViewModel> {
    const response = await WorkspaceApiService.getWorkspaceById(id);
    return mapWorkspaceDtoToViewModel(response.data as WorkspaceDTO);
  }

  static async getWorkspaceMembers(id: string): Promise<WorkspaceMemberViewModel[]> {
    const response = await WorkspaceApiService.getWorkspaceMembers(id);
    return mapWorkspaceMemberListDtoToViewModel(response.data as WorkspaceMemberDTO[]);
  }

  static async updateWorkspace(id: string, name: string) {
    const response = await WorkspaceApiService.updateWorkspace(id, name);
    return mapWorkspaceDtoToViewModel(response.data as WorkspaceDTO);
  }

  static async deleteWorkspace(id: string) {
    await WorkspaceApiService.deleteWorkspace(id);
  }
}
