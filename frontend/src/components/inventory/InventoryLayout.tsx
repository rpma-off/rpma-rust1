import { ReactNode } from 'react';
import { InventoryTabs } from '@/components/inventory/InventoryTabs';

interface InventoryLayoutProps {
  children: ReactNode;
}

export function InventoryLayout({ children }: InventoryLayoutProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-0 space-y-5">
      <div className="bg-[hsl(var(--rpma-teal))] text-white rounded-[10px] shadow-[var(--rpma-shadow-soft)]">
        <div className="px-5 pt-4 pb-0 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Inventory</h1>
        </div>
        <div className="px-2">
          <InventoryTabs />
        </div>
      </div>

      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}
