'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useMutationSignal } from '@/lib/data-freshness';
import { AuthProvider } from '@/domains/auth';
import { NotificationInitializer, NotificationPanel } from '@/domains/notifications';

function MutationSignalListener() {
  useMutationSignal();
  return null;
}

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
      <MutationSignalListener />
      <AuthProvider>
        <NotificationInitializer />
        {children}
        <Toaster position="top-right" richColors closeButton />
        <NotificationPanel />
      </AuthProvider>
    </QueryClientProvider>
  );
}
