import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserViewModel } from '../types/auth.types';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';

interface AuthState {
  accessToken: string | null;
  user: UserViewModel | null;
  isAuthenticated: boolean;
  /**
   * Atomic login action. Sets token, user, and active workspace synchronously
   * to prevent inconsistent render states.
   */
  login: (payload: { token: string; user: UserViewModel; defaultWorkspaceId?: string }) => void;
  updateToken: (token: string) => void;
  clearAuth: () => void;
  setUser: (user: UserViewModel) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      login: (payload) => {
        if (payload.defaultWorkspaceId) {
          useWorkspaceStore.getState().setActiveWorkspace(payload.defaultWorkspaceId);
        }
        
        set({ 
          accessToken: payload.token, 
          user: payload.user, 
          isAuthenticated: true 
        });
      },
      updateToken: (token) => set({ accessToken: token, isAuthenticated: !!token }),
      clearAuth: () => {
        useWorkspaceStore.getState().setActiveWorkspace('');
        set({ accessToken: null, user: null, isAuthenticated: false });
      },
      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
