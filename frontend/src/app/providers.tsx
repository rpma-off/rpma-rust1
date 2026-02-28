'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '@/domains/auth';
import { Toaster } from 'sonner';
import { NotificationInitializer, NotificationPanel } from '@/domains/notifications/components';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
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
