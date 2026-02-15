'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Truck, BarChart3, Settings, Menu } from 'lucide-react';
import { MaterialCatalog } from './MaterialCatalog';
import { SupplierManagement } from './SupplierManagement';
import { InventoryReports } from './InventoryReports';
import { InventorySettings } from './InventorySettings';
import { useTranslation } from '@/hooks/useTranslation';

export function InventoryTabs() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('materials');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const tabConfig = [
    {
      id: 'materials',
      label: t('inventory.materials'),
      icon: Package,
    },
    {
      id: 'suppliers',
      label: t('inventory.suppliers'),
      icon: Truck,
    },
    {
      id: 'reports',
      label: t('inventory.reports'),
      icon: BarChart3,
    },
    {
      id: 'settings',
      label: t('inventory.settings'),
      icon: Settings,
    },
  ] as const;

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setMobileNavOpen(false);
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="lg:hidden mb-3 px-2">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between border-white/25 bg-white/10 text-white hover:bg-white/15 hover:text-white"
            >
              <div className="flex items-center">
                <Menu className="h-4 w-4 mr-3" />
                <span>{tabConfig.find(tab => tab.id === activeTab)?.label}</span>
              </div>
              <span className="text-xs opacity-70">{tabConfig.findIndex(tab => tab.id === activeTab) + 1}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[65vh] bg-background border-[hsl(var(--rpma-border))]">
            <SheetHeader className="text-left">
              <SheetTitle className="text-foreground">{t('inventory.title')}</SheetTitle>
              <SheetDescription>{t('inventory.selectSection')}</SheetDescription>
            </SheetHeader>
            <div className="mt-5 space-y-2">
              {tabConfig.map((tab, index) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? 'default' : 'ghost'}
                    className={`w-full justify-start h-11 ${activeTab === tab.id ? 'bg-[hsl(var(--rpma-teal))] text-black hover:bg-[hsl(var(--rpma-teal))]/90' : ''}`}
                    onClick={() => handleTabChange(tab.id)}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    <span className="flex-1 text-left">{tab.label}</span>
                    <span className="text-xs opacity-70">{index + 1}</span>
                  </Button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden lg:block">
        <TabsList data-variant="underline" className="w-full justify-start">
          {tabConfig.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id} data-variant="underline" className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      <TabsContent value="materials" className="mt-0">
        <MaterialCatalog />
      </TabsContent>

      <TabsContent value="suppliers" className="mt-0">
        <SupplierManagement />
      </TabsContent>

      <TabsContent value="reports" className="mt-0">
        <InventoryReports />
      </TabsContent>

      <TabsContent value="settings" className="mt-0">
        <InventorySettings />
      </TabsContent>
    </Tabs>
  );
}
