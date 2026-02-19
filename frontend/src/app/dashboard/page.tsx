'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/domains/auth';
import { CalendarDashboard } from '@/domains/workflow';
import { ErrorBoundary } from '@/shared/ui/ui/error-boundary';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { LoadingState } from '@/shared/ui/layout/LoadingState';
import { useTranslation } from '@/shared/hooks/useTranslation';

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

