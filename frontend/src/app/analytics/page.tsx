import { Suspense } from 'react';
import { AnalyticsDashboard } from '@/shared/ui/analytics/AnalyticsDashboard';
import { AnalyticsLayout } from '@/shared/ui/analytics/AnalyticsLayout';
import { LoadingState } from '@/shared/ui/layout/LoadingState';

export default function AnalyticsPage() {
  return (
    <AnalyticsLayout>
      <Suspense fallback={<LoadingState />}>
        <AnalyticsDashboard />
      </Suspense>
    </AnalyticsLayout>
  );
}

