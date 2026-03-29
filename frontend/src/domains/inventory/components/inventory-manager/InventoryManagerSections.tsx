'use client';

import {
  AlertTriangle,
  Download,
  Filter,
  Package,
  Plus,
  RefreshCw,
  Search,
  Upload,
  XCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VirtualizedTable } from '@/components/ui/virtualized-table';
import type { Material, MaterialType } from '@/shared/types';
import { MaterialForm } from '../MaterialForm';
import { StockLevelIndicator } from '../StockLevelIndicator';

interface InventoryManagerHeaderProps {
  onImport: () => void;
  onExport: () => void;
  isCreateDialogOpen: boolean;
  setIsCreateDialogOpen: (open: boolean) => void;
  onCreated: () => void;
}

export function InventoryManagerHeader({
  onImport,
  onExport,
  isCreateDialogOpen,
  setIsCreateDialogOpen,
  onCreated,
}: InventoryManagerHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold">Gestion de l&apos;inventaire</h2>
        <p className="text-muted-foreground">
          Gérez votre inventaire de matériaux et suivez les niveaux de stock
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onImport}>
          <Upload className="mr-2 h-4 w-4" />
          Importer
        </Button>
        <Button variant="outline" onClick={onExport}>
          <Download className="mr-2 h-4 w-4" />
          Exporter
        </Button>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un matériau
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajouter un nouveau matériau</DialogTitle>
            </DialogHeader>
            <MaterialForm onClose={onCreated} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

interface InventoryStatsCardsProps {
  totalMaterials: number;
  lowStockCount: number;
  expiredCount: number;
  totalValue: string;
}

export function InventoryStatsCards({
  totalMaterials,
  lowStockCount,
  expiredCount,
  totalValue,
}: InventoryStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total matériaux</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalMaterials}</div>
          <p className="text-xs text-muted-foreground">Articles actifs de l&apos;inventaire</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Articles en stock faible</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{lowStockCount}</div>
          <p className="text-xs text-muted-foreground">Nécessitent une attention</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Articles expirés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{expiredCount}</div>
          <p className="text-xs text-muted-foreground">À retirer de l&apos;inventaire</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Valeur totale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalValue}</div>
          <p className="text-xs text-muted-foreground">Valeur actuelle de l&apos;inventaire</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function InventoryAlerts({
  lowStockCount,
  expiredCount,
}: {
  lowStockCount: number;
  expiredCount: number;
}) {
  return (
    <>
      {lowStockCount > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {lowStockCount} matériau(x) sont en stock faible. Pensez à recommander prochainement pour éviter les ruptures.
          </AlertDescription>
        </Alert>
      )}

      {expiredCount > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {expiredCount} matériau(x) ont expiré et doivent être retirés de l&apos;inventaire.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}

interface InventoryFiltersCardProps {
  searchTerm: string;
  selectedType: MaterialType | null;
  selectedCategory: string | null;
  showInactive: boolean;
  loading: boolean;
  materialTypeOptions: { value: MaterialType; label: string }[];
  uniqueCategories: string[];
  onSearchChange: (value: string) => void;
  onTypeChange: (value: MaterialType | null) => void;
  onCategoryChange: (value: string | null) => void;
  onToggleInactive: () => void;
  onRefresh: () => void;
}

export function InventoryFiltersCard({
  searchTerm,
  selectedType,
  selectedCategory,
  showInactive,
  loading,
  materialTypeOptions,
  uniqueCategories,
  onSearchChange,
  onTypeChange,
  onCategoryChange,
  onToggleInactive,
  onRefresh,
}: InventoryFiltersCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtres
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher des matériaux..."
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              className="pl-8"
            />
          </div>

          <Select
            value={selectedType || '__all__'}
            onValueChange={(value) =>
              onTypeChange(value === '__all__' ? null : (value as MaterialType))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner le type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les types</SelectItem>
              {materialTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedCategory || '__all__'}
            onValueChange={(value) =>
              onCategoryChange(value === '__all__' ? null : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner la catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes les catégories</SelectItem>
              {uniqueCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleInactive}
              className={showInactive ? 'bg-secondary' : ''}
            >
              Afficher inactifs
            </Button>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface InventoryMaterialsTableProps {
  materials: Material[];
  loading: boolean;
  error: string | null;
  onCreate: () => void;
  tableColumns: {
    key: string;
    header: string;
    render: (value: unknown, row: Material) => React.ReactNode;
  }[];
  activeFilters: boolean;
}

export function InventoryMaterialsTable({
  materials,
  loading,
  error,
  onCreate,
  tableColumns,
  activeFilters,
}: InventoryMaterialsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Matériaux ({materials.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        ) : materials.length === 0 ? (
          <div className="py-8 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">Aucun matériau trouvé</h3>
            <p className="mb-4 text-muted-foreground">
              {activeFilters
                ? 'Essayez de modifier vos filtres ou termes de recherche.'
                : "Commencez par ajouter votre premier matériau à l'inventaire."}
            </p>
            {!activeFilters && (
              <Button onClick={onCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter le premier matériau
              </Button>
            )}
          </div>
        ) : (
          <VirtualizedTable data={materials} columns={tableColumns} rowHeight={60} maxHeight={500} />
        )}
      </CardContent>
    </Card>
  );
}

interface InventoryManagerDialogsProps {
  isEditDialogOpen: boolean;
  setIsEditDialogOpen: (open: boolean) => void;
  isDetailsDialogOpen: boolean;
  setIsDetailsDialogOpen: (open: boolean) => void;
  selectedMaterial: Material | null;
  onEditClose: () => void;
}

export function InventoryManagerDialogs({
  isEditDialogOpen,
  setIsEditDialogOpen,
  isDetailsDialogOpen,
  setIsDetailsDialogOpen,
  selectedMaterial,
  onEditClose,
}: InventoryManagerDialogsProps) {
  return (
    <>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le matériau</DialogTitle>
          </DialogHeader>
          {selectedMaterial && (
            <MaterialForm material={selectedMaterial} onClose={onEditClose} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails du matériau</DialogTitle>
          </DialogHeader>
          {selectedMaterial && <StockLevelIndicator material={selectedMaterial} showDetails />}
        </DialogContent>
      </Dialog>
    </>
  );
}
