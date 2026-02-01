import { Suspense } from 'react';
import { InventoryDashboard } from '@/components/inventory/InventoryDashboard';
import { InventoryLayout } from '@/components/inventory/InventoryLayout';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function InventoryPage() {
  return (
    <InventoryLayout>
      <Suspense fallback={<LoadingSpinner />}>
        <InventoryDashboard />
      </Suspense>
    </InventoryLayout>
  );
}