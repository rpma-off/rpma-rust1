'use client';

import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpDown, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ErrorState } from '@/shared/ui/layout/ErrorState';
import { LoadingState } from '@/shared/ui/layout/LoadingState';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { useAuth } from '@/shared/hooks/useAuth';
import { useMaterials } from '../hooks/useMaterials';
import type { Material, MaterialType } from '../api/types';
import { useInventory } from '../hooks/useInventory';
import { MaterialForm } from './MaterialForm';
import {
  MaterialCatalogFilters,
  MaterialCatalogTable,
  StockAdjustmentDialog,
} from './material-catalog/MaterialCatalogSections';

function getMaterialTypeLabel(materialType: string, t: (key: string) => string): string {
  switch (materialType) {
    case 'ppf_film':
      return t('inventory.typePpfFilm');
    case 'adhesive':
      return t('inventory.typeAdhesive');
    case 'cleaning_solution':
      return t('inventory.typeCleaningSolution');
    case 'tool':
      return t('inventory.typeTool');
    case 'consumable':
      return t('inventory.typeConsumable');
    default:
      return materialType.replace(/_/g, ' ');
  }
}

export function MaterialCatalog() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [materialTypeFilter, setMaterialTypeFilter] = useState<MaterialType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [stockMaterial, setStockMaterial] = useState<Material | null>(null);
  const [stockQuantity, setStockQuantity] = useState(0);
  const [stockReason, setStockReason] = useState('');
  const [stockSaving, setStockSaving] = useState(false);
  const [archiving, setArchiving] = useState<string | null>(null);

  const { materials, loading, error, refetch } = useMaterials({
    materialType: materialTypeFilter !== 'all' ? materialTypeFilter : undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    search: searchTerm || undefined,
  });

  const { stats, updateStock, deleteMaterial } = useInventory();
  const filteredMaterials = useMemo(() => materials ?? [], [materials]);
  const categoryEntries = useMemo(
    () =>
      Object.entries(stats?.materials_by_category ?? {}).map(
        ([category, count]) => [category, count ?? 0] as [string, number],
      ),
    [stats?.materials_by_category],
  );
  const hasActiveFilters =
    searchTerm.trim().length > 0 || materialTypeFilter !== 'all' || categoryFilter !== 'all';

  const handleEdit = useCallback((material: Material) => {
    setEditingMaterial(material);
    setShowForm(true);
  }, []);

  const handleCreate = useCallback(() => {
    setEditingMaterial(null);
    setShowForm(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setEditingMaterial(null);
    void refetch();
  }, [refetch]);

  const handleArchive = useCallback(async (materialId: string) => {
    if (!user?.token) {
      toast.error(t('errors.unauthorized'));
      return;
    }

    try {
      setArchiving(materialId);
      await deleteMaterial(materialId);
      toast.success(t('inventory.materialArchived'));
    } catch (err) {
      toast.error(`${t('errors.generic')}: ${err}`);
    } finally {
      setArchiving(null);
    }
  }, [deleteMaterial, t, user?.token]);

  const handleStockAdjust = useCallback((material: Material) => {
    setStockMaterial(material);
    setStockQuantity(0);
    setStockReason('');
    setShowStockDialog(true);
  }, []);

  const submitStockAdjustment = useCallback(async () => {
    if (!stockMaterial || stockQuantity === 0 || !stockReason.trim()) return;

    try {
      setStockSaving(true);
      await updateStock({
        material_id: stockMaterial.id,
        quantity_change: stockQuantity,
        reason: stockReason,
      });
      toast.success(t('inventory.stockUpdated'));
      setShowStockDialog(false);
      await refetch();
    } catch (err) {
      toast.error(`${t('errors.generic')}: ${err}`);
    } finally {
      setStockSaving(false);
    }
  }, [refetch, stockMaterial, stockQuantity, stockReason, t, updateStock]);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setMaterialTypeFilter('all');
    setCategoryFilter('all');
  }, []);

  const formatCurrency = useCallback((value?: number, currency: string = 'EUR') => {
    if (typeof value !== 'number') {
      return t('common.notDefined');
    }

    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  }, [t]);

  const materialColumns = useMemo(
    () => [
      {
        key: 'sku',
        header: t('inventory.sku'),
        width: 130,
        render: (value: unknown) => (
          <div className="font-mono text-foreground">{String(value || '-')}</div>
        ),
      },
      {
        key: 'name',
        header: t('inventory.name'),
        width: 220,
        render: (value: unknown) => (
          <div className="truncate text-foreground">{String(value || '-')}</div>
        ),
      },
      {
        key: 'material_type',
        header: t('inventory.materialType'),
        width: 170,
        render: (value: unknown) => (
          <Badge variant="outline" className="border-blue-300 text-blue-600">
            {getMaterialTypeLabel(String(value || ''), t)}
          </Badge>
        ),
      },
      {
        key: 'current_stock',
        header: t('inventory.currentStock'),
        width: 180,
        render: (_value: unknown, material: Material) => (
          <div className="flex items-center gap-2">
            <span className="text-foreground">
              {material.current_stock} {material.unit_of_measure}
            </span>
            {material.current_stock <= (material.minimum_stock || 0) && (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
          </div>
        ),
      },
      {
        key: 'unit_cost',
        header: t('inventory.unitCost'),
        width: 140,
        render: (_value: unknown, material: Material) => (
          <div className="text-foreground">
            {formatCurrency(material.unit_cost ?? undefined, material.currency)}
          </div>
        ),
      },
      {
        key: 'status',
        header: t('inventory.status'),
        width: 120,
        render: (_value: unknown, material: Material) => (
          <Badge
            variant={material.is_active ? 'default' : 'secondary'}
            className={material.is_active ? 'bg-[hsl(var(--rpma-teal))] text-white' : ''}
          >
            {material.is_active ? t('inventory.active') : t('inventory.inactive')}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        width: 150,
        render: (_value: unknown, material: Material) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              aria-label={t('common.edit')}
              title={t('common.edit')}
              onClick={() => handleEdit(material)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={t('inventory.adjustStock')}
              title={t('inventory.adjustStock')}
              onClick={() => handleStockAdjust(material)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={t('inventory.archiveMaterial')}
                  title={t('inventory.archiveMaterial')}
                  className="text-muted-foreground hover:text-destructive"
                  disabled={archiving === material.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('inventory.archiveConfirmTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('inventory.archiveConfirmDescription', { name: material.name })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleArchive(material.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t('inventory.archiveMaterial')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ),
      },
    ],
    [archiving, formatCurrency, handleArchive, handleEdit, handleStockAdjust, t],
  );

  if (!user?.token) {
    return <ErrorState message={t('errors.unauthorized')} />;
  }

  if (loading) {
    return <LoadingState message={t('common.loading')} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{t('inventory.catalog')}</h2>
          <p className="text-muted-foreground">{t('inventory.catalogDesc')}</p>
        </div>
        <Button onClick={handleCreate}>
          Ajouter un matériau
        </Button>
      </div>

      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) {
            setEditingMaterial(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border-[hsl(var(--rpma-border))] bg-white">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingMaterial ? t('inventory.editMaterial') : t('inventory.addNewMaterial')}
            </DialogTitle>
          </DialogHeader>
          <MaterialForm material={editingMaterial} onClose={handleFormClose} />
        </DialogContent>
      </Dialog>

      <MaterialCatalogFilters
        searchTerm={searchTerm}
        materialTypeFilter={materialTypeFilter}
        categoryFilter={categoryFilter}
        categoryEntries={categoryEntries}
        hasActiveFilters={hasActiveFilters}
        t={t}
        onSearchChange={setSearchTerm}
        onTypeChange={setMaterialTypeFilter}
        onCategoryChange={setCategoryFilter}
        onClear={clearFilters}
      />

      <MaterialCatalogTable
        filteredMaterials={filteredMaterials}
        materialColumns={materialColumns}
        hasActiveFilters={hasActiveFilters}
        t={t}
        onCreate={handleCreate}
      />

      <StockAdjustmentDialog
        open={showStockDialog}
        onOpenChange={setShowStockDialog}
        stockMaterial={stockMaterial}
        stockQuantity={stockQuantity}
        stockReason={stockReason}
        stockSaving={stockSaving}
        t={t}
        onQuantityChange={setStockQuantity}
        onReasonChange={setStockReason}
        onSubmit={submitStockAdjustment}
      />
    </div>
  );
}
