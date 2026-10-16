import React, { useEffect, useState } from 'react';
import { FullScreenLoader } from './FullScreenLoader';
import { useAuthStore } from '../stores/authStore';
import { authRefreshService } from '../api/authRefreshService';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isHydrating, setIsHydrating] = useState(true);
  const hasHydrated = React.useRef(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;

    const hydrateAuth = async () => {
      try {
        if (import.meta.env.DEV) console.debug('[Auth] Hydrating session on startup...');
        await authRefreshService.refreshToken();
        if (import.meta.env.DEV) console.debug('[Auth] Session hydrated successfully.');
      } catch (error: any) {
        if (error?.response?.status === 401) {
          if (import.meta.env.DEV) console.debug('[Auth] No active session (401) during hydration.');
        } else {
          if (import.meta.env.DEV) console.debug('[Auth] Failed to hydrate session on startup:', error);
        }
        clearAuth();
      } finally {
        setIsHydrating(false);
      }
    };

    hydrateAuth();
  }, [isAuthenticated, clearAuth]);

  if (isHydrating) {
    return <FullScreenLoader message="Checking session..." />;
  }

  return <>{children}</>;
};
