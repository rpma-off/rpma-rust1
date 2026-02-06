'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Truck, BarChart3, Settings } from 'lucide-react';
import { MaterialCatalog } from './MaterialCatalog';
import { SupplierManagement } from './SupplierManagement';
import { InventoryReports } from './InventoryReports';
import { InventorySettings } from './InventorySettings';

export function InventoryTabs() {
  const [activeTab, setActiveTab] = useState('materials');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList data-variant="underline" className="w-full justify-start">
        <TabsTrigger value="materials" data-variant="underline" className="flex items-center gap-2">
          <Package className="w-4 h-4" />
          Materials
        </TabsTrigger>
        <TabsTrigger value="suppliers" data-variant="underline" className="flex items-center gap-2">
          <Truck className="w-4 h-4" />
          Suppliers
        </TabsTrigger>
        <TabsTrigger value="reports" data-variant="underline" className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Reports
        </TabsTrigger>
        <TabsTrigger value="settings" data-variant="underline" className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Settings
        </TabsTrigger>
      </TabsList>

      <TabsContent value="materials" className="mt-4">
        <MaterialCatalog />
      </TabsContent>

      <TabsContent value="suppliers" className="mt-4">
        <SupplierManagement />
      </TabsContent>

      <TabsContent value="reports" className="mt-4">
        <InventoryReports />
      </TabsContent>

      <TabsContent value="settings" className="mt-4">
        <InventorySettings />
      </TabsContent>
    </Tabs>
  );
}
