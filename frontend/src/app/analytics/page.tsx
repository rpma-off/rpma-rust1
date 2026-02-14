import { Suspense } from 'react';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { AnalyticsLayout } from '@/components/analytics/AnalyticsLayout';
import { LoadingState } from '@/components/layout/LoadingState';

export default function AnalyticsPage() {
  return (
    <AnalyticsLayout>
      <Suspense fallback={<LoadingState />}>
        <AnalyticsDashboard />
      </Suspense>
    </AnalyticsLayout>
  );
}
