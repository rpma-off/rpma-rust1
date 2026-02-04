import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import the reports page to enable code splitting
const ReportsPage = dynamic(() => import('./page.client'), {
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-[hsl(var(--rpma-surface))]">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[hsl(var(--rpma-teal))]"></div>
    </div>
  ),
  ssr: false, // Disable SSR for this component as it uses client-side hooks and charts
});

export default function Reports() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[hsl(var(--rpma-surface))]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[hsl(var(--rpma-teal))]"></div>
      </div>
    }>
      <ReportsPage />
    </Suspense>
  );
}
