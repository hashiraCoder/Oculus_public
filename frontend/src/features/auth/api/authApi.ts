import axiosInstance from '@/lib/axios';
import type { LoginFormData, RegisterFormData, ForgotPasswordFormData, ResetPasswordFormData } from '../schemas/authSchemas';
import type { AuthResponseDTO } from '../dto/auth.dto';
import type { ApiResponse } from '@/types/api.types';

export const authApi = {
  register: async (data: RegisterFormData): Promise<ApiResponse<AuthResponseDTO>> => {
    const response = await axiosInstance.post<ApiResponse<AuthResponseDTO>>('/auth/register', data);
    return response.data;
  },
  
  login: async (data: LoginFormData): Promise<ApiResponse<AuthResponseDTO>> => {
    const response = await axiosInstance.post<ApiResponse<AuthResponseDTO>>('/auth/login', data);
    return response.data;
  },
  
  logout: async (): Promise<ApiResponse<null>> => {
    const response = await axiosInstance.post<ApiResponse<null>>('/auth/logout');
    return response.data;
  },
  
  logoutAll: async (): Promise<ApiResponse<null>> => {
    const response = await axiosInstance.post<ApiResponse<null>>('/auth/logout-all');
    return response.data;
  },
  
  // Note: refresh is handled cleanly by authRefreshService for interceptors, 
  // but if components need manual refresh, this could be used.
  refresh: async (): Promise<ApiResponse<AuthResponseDTO>> => {
    const response = await axiosInstance.post<ApiResponse<AuthResponseDTO>>('/auth/refresh');
    return response.data;
  },
  
  forgotPassword: async (data: ForgotPasswordFormData): Promise<ApiResponse<null>> => {
    const response = await axiosInstance.post<ApiResponse<null>>('/auth/forgot-password', data);
    return response.data;
  },
  
  resetPassword: async (data: ResetPasswordFormData & { token: string }): Promise<ApiResponse<null>> => {
    const response = await axiosInstance.post<ApiResponse<null>>('/auth/reset-password', data);
    return response.data;
  }
};
