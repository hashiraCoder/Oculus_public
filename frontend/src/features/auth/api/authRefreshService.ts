import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const rawAxios = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

let refreshPromise: Promise<string> | null = null;

export const authRefreshService = {
  /**
   * Refreshes the token using a raw Axios instance that bypasses all interceptors.
   * Utilizes a single-flight queue: if multiple requests hit this simultaneously,
   * they will all wait for the single active promise to resolve.
   */
  refreshToken: async (): Promise<string> => {
    // Instrumentation: Log caller, route, and stack
    if (import.meta.env.DEV) {
      console.debug('[authRefreshService] refreshToken() invoked');
      console.debug('[authRefreshService] Route:', window.location.pathname);
      console.debug('[authRefreshService] Stack Trace:', new Error().stack);
    }

    if (refreshPromise) {
      if (import.meta.env.DEV) {
        console.debug('[authRefreshService] Joining existing refresh promise');
      }
      return refreshPromise;
    }

    if (import.meta.env.DEV) {
      console.debug('[authRefreshService] Starting new refresh request');
    }

    refreshPromise = (async () => {
      try {
        const response = await rawAxios.post('/auth/refresh');
        const data = response.data;
        const newToken = data.data?.accessToken;
        
        if (!newToken) {
          throw new Error('Refresh response missing access token payload');
        }

        if (import.meta.env.DEV) {
          console.debug('[authRefreshService] Refresh successful, updating token in store');
        }

       
        useAuthStore.getState().login({
          token: newToken,
          user: data.data?.user,
          defaultWorkspaceId: data.data?.workspaces?.[0]?.id
        });
        
        return newToken;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.debug('[authRefreshService] Refresh failed, clearing auth state', error);
        }
        // Clear auth on failure
        useAuthStore.getState().clearAuth();
        throw error;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  }
};
