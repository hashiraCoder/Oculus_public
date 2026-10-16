import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkspaceState {
  activeWorkspaceId: string | null;
  isWorkspaceSwitcherOpen: boolean;
  setActiveWorkspace: (id: string) => void;
  setWorkspaceSwitcherOpen: (isOpen: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      isWorkspaceSwitcherOpen: false,
      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
      setWorkspaceSwitcherOpen: (isOpen) => set({ isWorkspaceSwitcherOpen: isOpen }),
    }),
    {
      name: 'workspace-storage',
      partialize: (state) => ({ activeWorkspaceId: state.activeWorkspaceId }),
    }
  )
);
