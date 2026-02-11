'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/compatibility';
import { CalendarDashboard } from '@/components/dashboard/CalendarDashboard';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { PageShell } from '@/components/layout/PageShell';
import { LoadingState } from '@/components/layout/LoadingState';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <PageShell>
        <LoadingState message="Chargement..." />
      </PageShell>
    );
  }

  return (
    <ErrorBoundary>
      <CalendarDashboard />
    </ErrorBoundary>
  );
}
