'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { LoadingState } from '@/shared/ui/layout/LoadingState';

const CalendarDashboard = dynamic(
  () => import('@/domains/calendar').then((mod) => mod.CalendarDashboard),
  { ssr: false, loading: () => <LoadingState /> }
);

export default function DashboardPage() {
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
