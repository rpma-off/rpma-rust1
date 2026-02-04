import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { InventoryTabs } from '@/components/inventory/InventoryTabs';

interface InventoryLayoutProps {
  children: ReactNode;
}

export function InventoryLayout({ children }: InventoryLayoutProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Inventory Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage materials, suppliers, and track inventory movements
          </p>
        </div>
      </div>

      <Card className="rpma-shell">
        <InventoryTabs />
      </Card>

      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}
