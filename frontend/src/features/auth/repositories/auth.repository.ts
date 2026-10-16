import { authApi } from '../api/authApi';
import { mapAuthResponseToViewModel } from '../mappers/auth.mapper';
import type { LoginFormData, RegisterFormData, ForgotPasswordFormData, ResetPasswordFormData } from '../schemas/authSchemas';
import type { AuthViewModel } from '../types/auth.types';

export const authRepository = {
  register: async (data: RegisterFormData): Promise<AuthViewModel> => {
    // API returns ApiResponse<AuthResponseDTO>
    const response = await authApi.register(data);
    // Repository is the ONLY layer that unboxes response.data
    return mapAuthResponseToViewModel(response.data);
  },
  
  login: async (data: LoginFormData): Promise<AuthViewModel> => {
    const response = await authApi.login(data);
    return mapAuthResponseToViewModel(response.data);
  },
  
  logout: async (): Promise<void> => {
    await authApi.logout();
  },
  
  logoutAll: async (): Promise<void> => {
    await authApi.logoutAll();
  },
  
  refresh: async (): Promise<AuthViewModel> => {
    const response = await authApi.refresh();
    return mapAuthResponseToViewModel(response.data);
  },
  
  forgotPassword: async (data: ForgotPasswordFormData): Promise<void> => {
    await authApi.forgotPassword(data);
  },
  
  resetPassword: async (data: ResetPasswordFormData & { token: string }): Promise<void> => {
    await authApi.resetPassword(data);
  }
};
