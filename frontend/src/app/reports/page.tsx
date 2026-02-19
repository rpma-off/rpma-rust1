import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { LoadingState } from '@/shared/ui/layout/LoadingState';

// Dynamically import the reports page to enable code splitting
const ReportsPage = dynamic(() => import('./page.client'), {
  loading: () => <LoadingState />,
  ssr: false, // Disable SSR for this component as it uses client-side hooks and charts
});

export default function Reports() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ReportsPage />
    </Suspense>
  );
}

