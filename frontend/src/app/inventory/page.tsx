import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { LoadingState } from '@/shared/ui/layout/LoadingState';

const InventoryDashboard = dynamic(
  () => import('@/domains/inventory').then((mod) => ({ default: mod.InventoryDashboard })),
  { loading: () => <LoadingState />, ssr: false }
);

const InventoryLayout = dynamic(
  () => import('@/domains/inventory').then((mod) => ({ default: mod.InventoryLayout })),
  { loading: () => <LoadingState />, ssr: false }
);

export default function InventoryPage() {
  return (
    <ErrorBoundary>
    <PageShell>
      <Suspense fallback={<LoadingState />}>
        <InventoryDashboard />
      </Suspense>
      <Suspense fallback={<LoadingState />}>
        <InventoryLayout />
      </Suspense>
    </PageShell>
    </ErrorBoundary>
  );
}

