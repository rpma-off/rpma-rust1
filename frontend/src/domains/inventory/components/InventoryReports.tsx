'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, AlertTriangle, Package } from 'lucide-react';
import { LoadingState } from '@/components/layout/LoadingState';
import { ErrorState } from '@/components/layout/ErrorState';
import { EmptyState } from '@/components/ui/empty-state';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { useAuth } from '@/domains/auth';
import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { Material, InventoryMovementSummary } from '@/lib/inventory';

export function InventoryReports() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [lowStockMaterials, setLowStockMaterials] = useState<Material[]>([]);
  const [movementSummary, setMovementSummary] = useState<InventoryMovementSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    if (!user?.token) {
      setLowStockMaterials([]);
      setMovementSummary([]);
      setError(t('errors.unauthorized'));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [lowStock, movements] = await Promise.all([
        safeInvoke<Material[]>(IPC_COMMANDS.MATERIAL_GET_LOW_STOCK_MATERIALS, { sessionToken: user.token }),
        safeInvoke<InventoryMovementSummary[]>(IPC_COMMANDS.MATERIAL_GET_INVENTORY_MOVEMENT_SUMMARY, { sessionToken: user.token }),
      ]);
      setLowStockMaterials(lowStock);
      setMovementSummary(movements);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [t, user?.token]);

  // Root cause fix: prevent StrictMode double-invoke request storms
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    fetchReports().finally(() => {
      fetchingRef.current = false;
    });
  }, [fetchReports]);

  if (!user?.token) {
    return <ErrorState message={t('errors.unauthorized')} />;
  }

  if (loading) {
    return <LoadingState message={t('common.loading')} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchReports} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">{t('inventory.reports')}</h2>
        <p className="text-muted-foreground">{t('inventory.reportsDesc')}</p>
      </div>

      <Card className="rpma-shell">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            {t('inventory.lowStockItems')} ({lowStockMaterials.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lowStockMaterials.length === 0 ? (
            <EmptyState
              icon={<Package className="w-10 h-10" />}
              title={t('inventory.noMaterials')}
              description={t('inventory.noLowStockItemsDesc')}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="rpma-table-header">
                  <TableHead>{t('inventory.sku')}</TableHead>
                  <TableHead>{t('inventory.name')}</TableHead>
                  <TableHead>{t('inventory.currentStock')}</TableHead>
                  <TableHead>{t('inventory.minimumStock')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockMaterials.map((material) => (
                  <TableRow key={material.id} className="border-border hover:bg-[hsl(var(--rpma-surface))]/35">
                    <TableCell className="text-foreground font-mono">{material.sku}</TableCell>
                    <TableCell className="text-foreground">{material.name}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        {material.current_stock} {material.unit_of_measure}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {material.minimum_stock ?? t('common.notDefined')} {material.unit_of_measure}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="rpma-shell">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {t('inventory.movementSummary')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {movementSummary.length === 0 ? (
            <EmptyState
              icon={<BarChart3 className="w-10 h-10" />}
              title={t('inventory.noMovements')}
              description={t('inventory.noMovementSummaryDesc')}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="rpma-table-header">
                  <TableHead>{t('inventory.name')}</TableHead>
                  <TableHead>{t('inventory.totalStockIn')}</TableHead>
                  <TableHead>{t('inventory.totalStockOut')}</TableHead>
                  <TableHead>{t('inventory.netMovement')}</TableHead>
                  <TableHead>{t('inventory.currentStock')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movementSummary.map((item) => (
                  <TableRow key={item.material_id} className="border-border hover:bg-[hsl(var(--rpma-surface))]/35">
                    <TableCell className="text-foreground font-medium">{item.material_name}</TableCell>
                    <TableCell className="text-green-600">+{item.total_stock_in}</TableCell>
                    <TableCell className="text-red-600">-{item.total_stock_out}</TableCell>
                    <TableCell className={item.net_movement >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {item.net_movement >= 0 ? '+' : ''}
                      {item.net_movement}
                    </TableCell>
                    <TableCell className="text-foreground">{item.current_stock}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
