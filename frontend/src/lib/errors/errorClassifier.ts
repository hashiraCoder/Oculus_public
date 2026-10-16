import { AxiosError } from 'axios';

export type ErrorClassification = 
  | 'ERR_NETWORK'
  | 'ERR_CANCELED'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'TOO_MANY_REQUESTS'
  | 'SERVER_ERROR'
  | 'JS_RUNTIME'
  | 'UNKNOWN';

export interface ClassifiedError {
  type: ErrorClassification;
  message: string;
  originalError: unknown;
  status?: number;
  data?: any;
}

export const classifyError = (error: unknown): ClassifiedError => {
  if (error instanceof TypeError || error instanceof ReferenceError) {
    return {
      type: 'JS_RUNTIME',
      message: error.message,
      originalError: error,
    };
  }

  if (error && typeof error === 'object' && 'name' in error && (error as any).name === 'AbortError') {
    return {
      type: 'ERR_CANCELED',
      message: 'Request was cancelled',
      originalError: error,
    };
  }

  if (error instanceof AxiosError || (error && typeof error === 'object' && 'isAxiosError' in error)) {
    const axiosError = error as AxiosError;
    
    if (axiosError.code === 'ERR_CANCELED') {
      return { type: 'ERR_CANCELED', message: 'Request was cancelled', originalError: error };
    }
    
    if (axiosError.code === 'ECONNABORTED' || axiosError.message?.toLowerCase().includes('timeout')) {
      return { type: 'TIMEOUT', message: 'Request timed out', originalError: error };
    }
    
    if (axiosError.code === 'ERR_NETWORK' || !axiosError.response) {
      return { type: 'ERR_NETWORK', message: 'Network connection lost. Unable to reach server.', originalError: error };
    }

    const status = axiosError.response?.status;
    const data = axiosError.response?.data;
    const backendMessage = (data as any)?.message || axiosError.message;

    switch (status) {
      case 401: return { type: 'UNAUTHORIZED', message: backendMessage, originalError: error, status, data };
      case 403: return { type: 'FORBIDDEN', message: backendMessage, originalError: error, status, data };
      case 404: return { type: 'NOT_FOUND', message: backendMessage, originalError: error, status, data };
      case 409: return { type: 'CONFLICT', message: backendMessage, originalError: error, status, data };
      case 422: return { type: 'VALIDATION', message: backendMessage, originalError: error, status, data };
      case 429: return { type: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Try again later.', originalError: error, status, data };
      default:
        if (status && status >= 500) {
          return { type: 'SERVER_ERROR', message: 'Internal server error.', originalError: error, status, data };
        }
    }
  }

  // Fallback for everything else
  return {
    type: 'UNKNOWN',
    message: error instanceof Error ? error.message : 'An unknown error occurred.',
    originalError: error,
  };
};
