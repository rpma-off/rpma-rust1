import { Suspense } from 'react';
import { InventoryDashboard } from '@/shared/ui/inventory/InventoryDashboard';
import { InventoryLayout } from '@/shared/ui/inventory/InventoryLayout';
import { PageShell } from '@/shared/ui/layout/PageShell';
import { LoadingState } from '@/shared/ui/layout/LoadingState';

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

