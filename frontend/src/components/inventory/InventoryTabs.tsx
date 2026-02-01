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
      <TabsList className="grid w-full grid-cols-4 bg-border-900">
        <TabsTrigger value="materials" className="flex items-center gap-2">
          <Package className="w-4 h-4" />
          Materials
        </TabsTrigger>
        <TabsTrigger value="suppliers" className="flex items-center gap-2">
          <Truck className="w-4 h-4" />
          Suppliers
        </TabsTrigger>
        <TabsTrigger value="reports" className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Reports
        </TabsTrigger>
        <TabsTrigger value="settings" className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Settings
        </TabsTrigger>
      </TabsList>

      <TabsContent value="materials" className="mt-6">
        <MaterialCatalog />
      </TabsContent>

      <TabsContent value="suppliers" className="mt-6">
        <SupplierManagement />
      </TabsContent>

      <TabsContent value="reports" className="mt-6">
        <InventoryReports />
      </TabsContent>

      <TabsContent value="settings" className="mt-6">
        <InventorySettings />
      </TabsContent>
    </Tabs>
  );
}