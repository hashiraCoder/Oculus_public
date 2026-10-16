import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authRepository } from '../repositories/auth.repository';
import { useAuthStore } from '../stores/authStore';
import type { LoginFormData, RegisterFormData, ForgotPasswordFormData, ResetPasswordFormData } from '../schemas/authSchemas';
import type { AuthViewModel } from '../types/auth.types';

export const useLogin = () => {
  const loginAction = useAuthStore((state) => state.login);
  
  return useMutation({
    mutationFn: (data: LoginFormData) => {
      if (import.meta.env.DEV) console.debug('[Auth] Request started: login');
      return authRepository.login(data);
    },
    onSuccess: (data: AuthViewModel) => {
      try {
        if (import.meta.env.DEV) console.debug('[Auth] Response received & Mapper succeeded');
        loginAction({ 
          token: data.accessToken, 
          user: data.user, 
          defaultWorkspaceId: data.workspaces?.[0]?.id 
        });
        if (import.meta.env.DEV) console.debug('[Auth] Store updated');
      } catch (error) {
        console.error('[Auth Error] Failed to update store on login success', error);
      }
    },
  });
};

export const useRegister = () => {
  const loginAction = useAuthStore((state) => state.login);
  
  return useMutation({
    mutationFn: (data: RegisterFormData) => {
      if (import.meta.env.DEV) console.debug('[Auth] Request started: register');
      return authRepository.register(data);
    },
    onSuccess: (data: AuthViewModel) => {
      try {
        if (import.meta.env.DEV) console.debug('[Auth] Response received & Mapper succeeded');
        loginAction({ 
          token: data.accessToken, 
          user: data.user, 
          defaultWorkspaceId: data.workspaces?.[0]?.id 
        });
        if (import.meta.env.DEV) console.debug('[Auth] Store updated');
      } catch (error) {
        console.error('[Auth Error] Failed to update store on register success', error);
      }
    },
  });
};

export const useLogout = () => {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => {
      if (import.meta.env.DEV) console.debug('[Auth] Request started: logout');
      return authRepository.logout();
    },
    onSuccess: () => {
      try {
        clearAuth();
        // Clear all queries (including cached workspace data, health checks, etc)
        queryClient.clear();
        if (import.meta.env.DEV) console.debug('[Auth] Store and React Query cache cleared');
      } catch (error) {
        console.error('[Auth Error] Failed to clear store on logout success', error);
      }
    },
    onError: () => {
      // Force clear on error anyway to prevent stuck state
      clearAuth();
      queryClient.clear();
    }
  });
};

export const useLogoutAll = () => {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => authRepository.logoutAll(),
    onSuccess: () => {
      try {
        clearAuth();
        queryClient.clear();
      } catch (error) {
        console.error('[Auth Error] Failed to clear store on logoutAll success', error);
      }
    },
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (data: ForgotPasswordFormData) => authRepository.forgotPassword(data),
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: (data: ResetPasswordFormData & { token: string }) => authRepository.resetPassword(data),
  });
};
