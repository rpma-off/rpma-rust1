import { Suspense } from 'react';
import { InventoryDashboard } from '@/components/inventory/InventoryDashboard';
import { InventoryLayout } from '@/components/inventory/InventoryLayout';
import { LoadingState } from '@/components/layout/LoadingState';

export default function InventoryPage() {
  return (
    <InventoryLayout>
      <Suspense fallback={<LoadingState />}>
        <InventoryDashboard />
      </Suspense>
    </InventoryLayout>
  );
}
