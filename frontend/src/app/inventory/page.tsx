import { Suspense } from 'react';
import { InventoryDashboard } from '@/components/inventory/InventoryDashboard';
import { InventoryLayout } from '@/components/inventory/InventoryLayout';
import { PageShell } from '@/components/layout/PageShell';
import { LoadingState } from '@/components/layout/LoadingState';

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
