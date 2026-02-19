import { Suspense } from 'react';
import { InventoryDashboard, InventoryLayout } from '@/domains/inventory';
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

