'use client';

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, AlertTriangle, Package } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useTranslation } from '@/hooks/useTranslation';
import type { Material, InventoryMovementSummary } from '@/lib/inventory';

export function InventoryReports() {
  const { t } = useTranslation();
  const [lowStockMaterials, setLowStockMaterials] = useState<Material[]>([]);
  const [movementSummary, setMovementSummary] = useState<InventoryMovementSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [lowStock, movements] = await Promise.all([
        invoke<Material[]>('material_get_low_stock', { sessionToken: '' }),
        invoke<InventoryMovementSummary[]>('material_get_inventory_movement_summary', { sessionToken: '' }),
      ]);
      setLowStockMaterials(lowStock);
      setMovementSummary(movements);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Card className="rpma-shell">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            {t('errors.generic')}: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">{t('inventory.reports')}</h2>

      {/* Low Stock Alert */}
      <Card className="rpma-shell">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            {t('inventory.lowStockItems')} ({lowStockMaterials.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lowStockMaterials.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">{t('inventory.noMaterials')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="rpma-table-header">
                  <TableHead>SKU</TableHead>
                  <TableHead>{t('inventory.name')}</TableHead>
                  <TableHead>{t('inventory.currentStock')}</TableHead>
                  <TableHead>{t('inventory.minimumStock')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockMaterials.map((material) => (
                  <TableRow key={material.id} className="border-border">
                    <TableCell className="text-foreground font-mono">{material.sku}</TableCell>
                    <TableCell className="text-foreground">{material.name}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        {material.current_stock} {material.unit_of_measure}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {material.minimum_stock ?? '—'} {material.unit_of_measure}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Movement Summary */}
      <Card className="rpma-shell">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {t('inventory.movementSummary')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {movementSummary.length === 0 ? (
            <div className="rpma-empty py-8">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t('inventory.noMovements')}</p>
            </div>
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
                  <TableRow key={item.material_id} className="border-border">
                    <TableCell className="text-foreground font-medium">{item.material_name}</TableCell>
                    <TableCell className="text-green-600">+{item.total_stock_in}</TableCell>
                    <TableCell className="text-red-600">-{item.total_stock_out}</TableCell>
                    <TableCell className={item.net_movement >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {item.net_movement >= 0 ? '+' : ''}{item.net_movement}
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
