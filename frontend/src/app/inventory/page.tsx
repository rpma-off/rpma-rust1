import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { LoadingState } from '@/shared/ui/layout/LoadingState';

const InventoryDashboard = dynamic(
  () => import('@/domains/inventory/components/InventoryDashboard').then((mod) => ({ default: mod.InventoryDashboard })),
  { loading: () => <LoadingState />, ssr: false }
);

const InventoryLayout = dynamic(
  () => import('@/domains/inventory/components/InventoryLayout').then((mod) => ({ default: mod.InventoryLayout })),
  { loading: () => <LoadingState />, ssr: false }
);

export default function InventoryPage() {
  return (
    <PageShell>
      <Suspense fallback={<LoadingState />}>
        <InventoryDashboard />
      </Suspense>
      <Suspense fallback={<LoadingState />}>
        <InventoryLayout />
      </Suspense>
    </PageShell>
  );
}

