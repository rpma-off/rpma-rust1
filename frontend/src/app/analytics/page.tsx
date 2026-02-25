import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { AnalyticsLayout } from '@/domains/analytics/facade';
import { LoadingState } from '@/shared/ui/layout/LoadingState';

const AnalyticsDashboard = dynamic(
  () => import('@/domains/analytics/facade').then((mod) => mod.AnalyticsDashboard),
  { ssr: false, loading: () => <LoadingState /> }
);

export default function AnalyticsPage() {
  return (
    <AnalyticsLayout>
      <Suspense fallback={<LoadingState />}>
        <AnalyticsDashboard />
      </Suspense>
    </AnalyticsLayout>
  );
}

