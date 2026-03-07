'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '@/domains/auth';
import { Toaster } from 'sonner';
import { NotificationInitializer, NotificationPanel } from '@/domains/notifications';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          const err = error as Error & { code?: string };
          if (err?.code === 'AUTH_FORBIDDEN' || err?.code === 'AUTHORIZATION' || err?.code === 'AUTHENTICATION') {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationInitializer />
        {children}
        <Toaster position="top-right" richColors closeButton />
        <NotificationPanel />
      </AuthProvider>
    </QueryClientProvider>
  );
}
