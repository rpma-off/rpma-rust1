'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

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
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 5000,
            style: {
              background: 'hsl(var(--card))',
              color: 'hsl(var(--card-foreground))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-lg)',
              fontSize: '14px',
              fontWeight: '500',
              backdropFilter: 'blur(8px)',
            },
            success: {
              duration: 4000,
              icon: <CheckCircle className="w-5 h-5 text-success" />,
              style: {
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--success))',
                color: 'hsl(var(--card-foreground))',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-lg)',
              },
            },
            error: {
              duration: 6000,
              icon: <XCircle className="w-5 h-5 text-error" />,
              style: {
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--error))',
                color: 'hsl(var(--card-foreground))',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-lg)',
              },
            },
            loading: {
              duration: Infinity,
              icon: <Loader2 className="w-5 h-5 text-info animate-spin" />,
              style: {
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--info))',
                color: 'hsl(var(--card-foreground))',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-lg)',
              },
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}