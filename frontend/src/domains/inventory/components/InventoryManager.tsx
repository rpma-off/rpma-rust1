'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, Edit, Eye, TrendingUp, XCircle } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { Material, MaterialType } from '@/shared/types';
import { useInventory } from '../hooks/useInventory';
import { StockLevelIndicator } from './StockLevelIndicator';
import {
  InventoryAlerts,
  InventoryFiltersCard,
  InventoryManagerDialogs,
  InventoryManagerHeader,
  InventoryMaterialsTable,
  InventoryStatsCards,
} from './inventory-manager/InventoryManagerSections';

interface InventoryManagerProps {
  className?: string;
}

export function InventoryManager({ className }: InventoryManagerProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<MaterialType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);

  const {
    materials,
    loading,
    error,
    stats,
    lowStockMaterials,
    expiredMaterials,
    refetch,
    deleteMaterial,
  } = useInventory({
    material_type: selectedType,
    category: selectedCategory,
    active_only: !showInactive,
    limit: 100,
  });

  const filteredMaterials = useMemo(
    () =>
      materials.filter(
        (material) =>
          material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          material.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          material.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          material.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [materials, searchTerm],
  );

  const materialTypeOptions = useMemo(
    () => [
      { value: 'ppf_film' as MaterialType, label: 'Film PPF' },
      { value: 'adhesive' as MaterialType, label: 'Adhésif' },
      { value: 'cleaning_solution' as MaterialType, label: 'Solution de nettoyage' },
      { value: 'tool' as MaterialType, label: 'Outil' },
      { value: 'consumable' as MaterialType, label: 'Consommable' },
    ],
    [],
  );

  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    materials.forEach((material) => {
      if (material.category) {
        categories.add(material.category);
      }
    });
    return Array.from(categories).sort();
  }, [materials]);

  const formatCurrency = useCallback((amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
    }).format(amount);
  }, []);

  const getStockStatusColor = useCallback((material: Material) => {
    if (material.current_stock <= 0 || material.is_expired) return 'text-red-600';
    if (material.is_discontinued) return 'text-gray-500';
    if (material.is_low_stock) return 'text-yellow-600';
    return 'text-green-600';
  }, []);

  const handleEdit = useCallback((material: Material) => {
    setSelectedMaterial(material);
    setIsEditDialogOpen(true);
  }, []);

  const handleViewDetails = useCallback((material: Material) => {
    setSelectedMaterial(material);
    setIsDetailsDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingMaterial) return;
    try {
      await deleteMaterial(deletingMaterial.id);
      setDeletingMaterial(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      import('sonner').then(({ toast }) => toast.error(msg));
    }
  }, [deleteMaterial, deletingMaterial]);

  const tableColumns = useMemo(
    () => [
      {
        key: 'sku',
        header: 'SKU',
        render: (_value: unknown, material: Material) => (
          <span className="font-mono text-sm">{material.sku}</span>
        ),
      },
      {
        key: 'name',
        header: 'Nom',
        render: (_value: unknown, material: Material) => (
          <div className="max-w-[200px]">
            <div className="truncate font-medium">{material.name}</div>
            {material.brand && (
              <div className="text-sm text-muted-foreground">{material.brand}</div>
            )}
          </div>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        render: (_value: unknown, material: Material) => (
          <Badge variant="outline" className="capitalize">
            {material.material_type.replace('_', ' ')}
          </Badge>
        ),
      },
      {
        key: 'stock',
        header: 'Niveau de stock',
        render: (_value: unknown, material: Material) => (
          <div className="min-w-[120px]">
            <StockLevelIndicator material={material} />
          </div>
        ),
      },
      {
        key: 'unit_cost',
        header: 'Coût unitaire',
        render: (_value: unknown, material: Material) => (
          <div>
            {material.unit_cost ? (
              formatCurrency(material.unit_cost, material.currency)
            ) : (
              <span className="text-muted-foreground">N/A</span>
            )}
          </div>
        ),
      },
      {
        key: 'location',
        header: 'Emplacement',
        render: (_value: unknown, material: Material) => (
          <div className="max-w-[100px]">
            {material.storage_location ? (
              <span className="truncate text-sm">{material.storage_location}</span>
            ) : (
              <span className="text-sm text-muted-foreground">N/A</span>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Statut',
        render: (_value: unknown, material: Material) => {
          const icon = material.is_expired ? (
            <XCircle className="h-4 w-4" />
          ) : material.is_low_stock ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <TrendingUp className="h-4 w-4" />
          );

          const text = material.is_expired
            ? 'Expiré'
            : material.is_discontinued
              ? 'Abandonné'
              : material.is_low_stock
                ? 'Faible'
                : 'OK';

          return (
            <div className="flex items-center gap-2">
              {icon}
              <span className={`text-sm ${getStockStatusColor(material)}`}>{text}</span>
            </div>
          );
        },
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (_value: unknown, material: Material) => (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => handleViewDetails(material)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleEdit(material)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [formatCurrency, getStockStatusColor, handleEdit, handleViewDetails],
  );

  return (
    <div data-testid="inventory-manager" className={`space-y-6 ${className}`}>
      <InventoryManagerHeader
        onImport={() => console.info('Importing inventory...')}
        onExport={() => console.info('Exporting inventory...')}
        isCreateDialogOpen={isCreateDialogOpen}
        setIsCreateDialogOpen={setIsCreateDialogOpen}
        onCreated={() => {
          setIsCreateDialogOpen(false);
          refetch();
        }}
      />

      <InventoryStatsCards
        totalMaterials={stats?.total_materials || 0}
        lowStockCount={stats?.low_stock_materials || 0}
        expiredCount={stats?.expired_materials || 0}
        totalValue={
          stats?.total_value ? formatCurrency(stats.total_value, 'EUR') : '€0.00'
        }
      />

      <InventoryAlerts
        lowStockCount={lowStockMaterials.length}
        expiredCount={expiredMaterials.length}
      />

      <InventoryFiltersCard
        searchTerm={searchTerm}
        selectedType={selectedType}
        selectedCategory={selectedCategory}
        showInactive={showInactive}
        loading={loading}
        materialTypeOptions={materialTypeOptions}
        uniqueCategories={uniqueCategories}
        onSearchChange={setSearchTerm}
        onTypeChange={setSelectedType}
        onCategoryChange={setSelectedCategory}
        onToggleInactive={() => setShowInactive((current) => !current)}
        onRefresh={refetch}
      />

      <InventoryMaterialsTable
        materials={filteredMaterials}
        loading={loading}
        error={error}
        onCreate={() => setIsCreateDialogOpen(true)}
        tableColumns={tableColumns}
        activeFilters={Boolean(searchTerm || selectedType || selectedCategory)}
      />

      <InventoryManagerDialogs
        isEditDialogOpen={isEditDialogOpen}
        setIsEditDialogOpen={setIsEditDialogOpen}
        isDetailsDialogOpen={isDetailsDialogOpen}
        setIsDetailsDialogOpen={setIsDetailsDialogOpen}
        selectedMaterial={selectedMaterial}
        onEditClose={() => {
          setIsEditDialogOpen(false);
          setSelectedMaterial(null);
          refetch();
        }}
      />

      <ConfirmDialog
        open={!!deletingMaterial}
        onOpenChange={(open) => !open && setDeletingMaterial(null)}
        title={t('inventory.deleteMaterial')}
        description={t('inventory.confirmDeleteMaterial', { name: deletingMaterial?.name || '' })}
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  );
}
