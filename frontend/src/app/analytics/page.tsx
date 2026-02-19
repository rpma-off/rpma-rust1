import { Suspense } from 'react';
import { AnalyticsDashboard } from '@/domains/analytics';
import { AnalyticsLayout } from '@/domains/analytics';
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

