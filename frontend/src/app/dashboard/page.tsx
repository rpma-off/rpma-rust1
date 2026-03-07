'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useDashboardPage } from '@/domains/auth';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { LoadingState } from '@/shared/ui/layout/LoadingState';

const CalendarDashboard = dynamic(
  () => import('@/domains/calendar').then((mod) => mod.CalendarDashboard),
  { ssr: false, loading: () => <LoadingState /> }
);

export default function DashboardPage() {
  const { authLoading, t } = useDashboardPage();

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
