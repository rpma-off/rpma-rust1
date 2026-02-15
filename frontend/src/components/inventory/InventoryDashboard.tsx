'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Package, TrendingUp, DollarSign } from 'lucide-react';
import { useInventoryStats } from '@/hooks/useInventoryStats';
import { LoadingState } from '@/components/layout/LoadingState';
import { ErrorState } from '@/components/layout/ErrorState';
import { useTranslation } from '@/hooks/useTranslation';

export function InventoryDashboard() {
  const { t } = useTranslation();
  const { stats, loading, error } = useInventoryStats();

  if (loading) {
    return <LoadingState message={t('common.loading')} />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!stats) {
    return (
      <Card className="rpma-shell">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">{t('common.noData')}</div>
        </CardContent>
      </Card>
    );
  }

  const totalValue = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(stats.total_value);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <Card className="rpma-shell">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('inventory.totalMaterials')}
          </CardTitle>
          <Package className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{stats.total_materials}</div>
          <p className="text-xs text-muted-foreground">
            {stats.active_materials} {t('inventory.active').toLowerCase()}
          </p>
        </CardContent>
      </Card>

      <Card className="rpma-shell">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('inventory.lowStockItems')}
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{stats.low_stock_materials}</div>
          <p className="text-xs text-muted-foreground">{t('inventory.requireAttention')}</p>
        </CardContent>
      </Card>

      <Card className="rpma-shell">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('inventory.totalValue')}
          </CardTitle>
          <DollarSign className="h-4 w-4 text-[hsl(var(--rpma-teal))]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{totalValue}</div>
          <p className="text-xs text-muted-foreground">{t('inventory.currentValue')}</p>
        </CardContent>
      </Card>

      <Card className="rpma-shell">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('inventory.stockTurnover')}
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{stats.stock_turnover_rate.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">{t('inventory.stockTurnoverHint')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
