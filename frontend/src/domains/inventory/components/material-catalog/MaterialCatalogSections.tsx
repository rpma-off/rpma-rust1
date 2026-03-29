'use client';

import { Package, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { VirtualizedTable } from '@/components/ui/virtualized-table';
import type { Material, MaterialType } from '../../api/types';

interface MaterialCatalogFiltersProps {
  searchTerm: string;
  materialTypeFilter: MaterialType | 'all';
  categoryFilter: string;
  categoryEntries: [string, number][];
  hasActiveFilters: boolean;
  t: (key: string) => string;
  onSearchChange: (value: string) => void;
  onTypeChange: (value: MaterialType | 'all') => void;
  onCategoryChange: (value: string) => void;
  onClear: () => void;
}

export function MaterialCatalogFilters({
  searchTerm,
  materialTypeFilter,
  categoryFilter,
  categoryEntries,
  hasActiveFilters,
  t,
  onSearchChange,
  onTypeChange,
  onCategoryChange,
  onClear,
}: MaterialCatalogFiltersProps) {
  return (
    <Card className="rpma-shell">
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground">{t('common.filter')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label={t('common.search')}
                placeholder={t('inventory.searchMaterials')}
                value={searchTerm}
                onChange={(event) => onSearchChange(event.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={materialTypeFilter} onValueChange={(value) => onTypeChange(value as MaterialType | 'all')}>
            <SelectTrigger className="w-full lg:w-52">
              <SelectValue placeholder={t('inventory.materialType')} />
            </SelectTrigger>
            <SelectContent className="border-[hsl(var(--rpma-border))] bg-white">
              <SelectItem value="all">{t('inventory.allTypes')}</SelectItem>
              <SelectItem value="ppf_film">{t('inventory.typePpfFilm')}</SelectItem>
              <SelectItem value="adhesive">{t('inventory.typeAdhesive')}</SelectItem>
              <SelectItem value="cleaning_solution">{t('inventory.typeCleaningSolution')}</SelectItem>
              <SelectItem value="tool">{t('inventory.typeTool')}</SelectItem>
              <SelectItem value="consumable">{t('inventory.typeConsumable')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-full lg:w-52">
              <SelectValue placeholder={t('inventory.category')} />
            </SelectTrigger>
            <SelectContent className="border-[hsl(var(--rpma-border))] bg-white">
              <SelectItem value="all">{t('inventory.allCategories')}</SelectItem>
              {categoryEntries.map(([category, count]) => (
                <SelectItem key={category} value={category}>
                  {category} ({count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="outline" onClick={onClear} className="w-full lg:w-auto">
              <X className="mr-2 h-4 w-4" />
              {t('inventory.clearFilters')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface MaterialCatalogTableProps {
  filteredMaterials: Material[];
  materialColumns: {
    key: string;
    header: string;
    width?: number;
    render: (value: unknown, material: Material) => React.ReactNode;
  }[];
  hasActiveFilters: boolean;
  t: (key: string) => string;
  onCreate: () => void;
}

export function MaterialCatalogTable({
  filteredMaterials,
  materialColumns,
  hasActiveFilters,
  t,
  onCreate,
}: MaterialCatalogTableProps) {
  return (
    <Card className="rpma-shell">
      <CardHeader>
        <CardTitle className="text-foreground">
          {t('inventory.materials')} ({filteredMaterials.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filteredMaterials.length === 0 ? (
          <EmptyState
            icon={<Package className="h-10 w-10" />}
            title={t('inventory.noMaterialsFound')}
            description={hasActiveFilters ? t('inventory.adjustFilters') : t('inventory.getStarted')}
            action={!hasActiveFilters ? <Button onClick={onCreate}>{t('inventory.addFirstMaterial')}</Button> : undefined}
          />
        ) : filteredMaterials.length > 50 ? (
          <VirtualizedTable
            data={filteredMaterials}
            columns={materialColumns}
            rowHeight={64}
            maxHeight={640}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="rpma-table-header">
                {materialColumns.map((column) => (
                  <TableHead key={column.key}>{column.header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map((material) => (
                <TableRow key={material.id} className="border-border hover:bg-[hsl(var(--rpma-surface))]/35">
                  {materialColumns.map((column) => (
                    <TableCell key={column.key}>
                      {column.render((material as Record<string, unknown>)[column.key], material)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockMaterial: Material | null;
  stockQuantity: number;
  stockReason: string;
  stockSaving: boolean;
  t: (key: string) => string;
  onQuantityChange: (value: number) => void;
  onReasonChange: (value: string) => void;
  onSubmit: () => void;
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  stockMaterial,
  stockQuantity,
  stockReason,
  stockSaving,
  t,
  onQuantityChange,
  onReasonChange,
  onSubmit,
}: StockAdjustmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-[hsl(var(--rpma-border))] bg-white">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {t('inventory.adjustStock')} - {stockMaterial?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-foreground">{t('inventory.currentStock')}</Label>
            <p className="text-sm text-muted-foreground">
              {stockMaterial?.current_stock} {stockMaterial?.unit_of_measure}
            </p>
          </div>
          <div>
            <Label htmlFor="stock-qty" className="text-foreground">
              {t('inventory.quantityChange')}
            </Label>
            <Input
              id="stock-qty"
              type="number"
              step="0.01"
              value={stockQuantity}
              onChange={(event) =>
                onQuantityChange(parseFloat(event.target.value) || 0)
              }
              placeholder="+10 / -5"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t('inventory.quantityChangeHint')}
            </p>
          </div>
          <div>
            <Label htmlFor="stock-reason" className="text-foreground">
              {t('inventory.reason')}
            </Label>
            <Textarea
              id="stock-reason"
              value={stockReason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder={t('inventory.reasonPlaceholder')}
              rows={2}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={onSubmit}
              disabled={stockSaving || stockQuantity === 0 || !stockReason.trim()}
            >
              {stockSaving ? t('inventory.saving') : t('inventory.confirmAdjustment')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
