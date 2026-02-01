import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { InventoryTabs } from '@/components/inventory/InventoryTabs';

interface InventoryLayoutProps {
  children: ReactNode;
}

export function InventoryLayout({ children }: InventoryLayoutProps) {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-border-300 mt-1">
            Manage materials, suppliers, and track inventory movements
          </p>
        </div>
      </div>

      <Card className="bg-border-800 border-border-700">
        <InventoryTabs />
      </Card>

      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}