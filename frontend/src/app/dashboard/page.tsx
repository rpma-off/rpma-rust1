'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/domains/auth';
import { ErrorBoundary } from '@/shared/ui/ui/error-boundary';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { LoadingState } from '@/shared/ui/layout/LoadingState';
import { useTranslation } from '@/shared/hooks/useTranslation';

const CalendarDashboard = dynamic(
  () => import('@/domains/workflow').then((mod) => mod.CalendarDashboard),
  { ssr: false, loading: () => <LoadingState /> }
);

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
      {/* Hauteur = 100vh moins la navbar (64px) pour éviter le scroll de page */}
      <div
        className="flex flex-col"
        style={{ height: 'calc(100vh - 64px)', minHeight: 0 }}
      >
        <CalendarDashboard />
      </div>
    </ErrorBoundary>
  );
}
