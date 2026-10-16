import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { router } from '../router';

import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { SocketProvider } from '@/providers/SocketProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SocketProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
          <Toaster 
            position="bottom-right"
            theme="dark"
            toastOptions={{
              style: {
                background: '#13161F',
                color: '#F8FAFC',
                border: '1px solid #353D57',
                fontSize: '12.5px',
                borderRadius: '6px',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.65)',
              },
            }}
          />
        </SocketProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
