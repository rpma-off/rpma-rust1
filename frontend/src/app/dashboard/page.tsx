'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/compatibility';
import { CalendarDashboard } from '@/components/dashboard/CalendarDashboard';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { PageShell } from '@/components/layout/PageShell';
import { LoadingState } from '@/components/layout/LoadingState';
import { useTranslation } from '@/hooks/useTranslation';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <PageShell>
        <LoadingState message={t('common.loading')} />
      </PageShell>
    );
  }

  return (
    <ErrorBoundary>
      <CalendarDashboard />
    </ErrorBoundary>
  );
}
