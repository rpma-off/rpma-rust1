'use client';

import { InventoryTabs } from './InventoryTabs';
import { useTranslation } from '@/shared/hooks/useTranslation';

export function InventoryLayout() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="bg-[hsl(var(--rpma-teal))] text-white rounded-[10px] shadow-[var(--rpma-shadow-soft)]">
        <div className="px-5 pt-4 pb-0">
          <h1 className="text-xl font-semibold">{t('inventory.title')}</h1>
          <p className="text-sm text-white/85 pb-3">{t('inventory.managementDesc')}</p>
        </div>
        <div className="px-2 pb-1">
          <InventoryTabs />
        </div>
      </div>
    </div>
  );
}
