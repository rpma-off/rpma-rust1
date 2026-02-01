import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import the reports page to enable code splitting
const ReportsPage = dynamic(() => import('./page.client'), {
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  ),
  ssr: false, // Disable SSR for this component as it uses client-side hooks and charts
});

export default function Reports() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ReportsPage />
    </Suspense>
  );
}