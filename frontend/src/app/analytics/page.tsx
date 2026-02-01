import { Suspense } from 'react';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { AnalyticsLayout } from '@/components/analytics/AnalyticsLayout';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function AnalyticsPage() {
  return (
    <AnalyticsLayout>
      <Suspense fallback={<LoadingSpinner />}>
        <AnalyticsDashboard />
      </Suspense>
    </AnalyticsLayout>
  );
}