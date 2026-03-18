'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
import { useMutationSignal } from '@/lib/data-freshness';
import { AuthProvider } from '@/domains/auth';
import { NotificationInitializer, NotificationPanel } from '@/domains/notifications';

function MutationSignalListener() {
  useMutationSignal();
  return null;
}

function onIpcCacheError(error: unknown) {
  const err = error as Error & { code?: string };
  if (err?.code === 'IPC_TIMEOUT') {
    toast.error('La requête a pris trop de temps. Veuillez réessayer.');
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    queryCache: new QueryCache({ onError: onIpcCacheError }),
    mutationCache: new MutationCache({ onError: onIpcCacheError }),
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
          // Allow exactly one retry on timeout; reads are safe to retry once
          if (err?.code === 'IPC_TIMEOUT') {
            return failureCount < 1;
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
