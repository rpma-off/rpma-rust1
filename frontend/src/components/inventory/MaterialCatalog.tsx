'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/layout/LoadingState';
import { ErrorState } from '@/components/layout/ErrorState';
import { Plus, Search, Edit, AlertTriangle, Package, Trash2, ArrowUpDown, X } from 'lucide-react';
import { useMaterials, type Material } from '@/hooks/useMaterials';
import { useInventoryStats } from '@/hooks/useInventoryStats';
import { useInventory } from '@/hooks/useInventory';
import { MaterialForm } from './MaterialForm';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/lib/auth/compatibility';
import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';

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
  const [materialTypeFilter, setMaterialTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [stockMaterial, setStockMaterial] = useState<Material | null>(null);
  const [stockQuantity, setStockQuantity] = useState<number>(0);
  const [stockReason, setStockReason] = useState('');
  const [stockSaving, setStockSaving] = useState(false);
  const [archiving, setArchiving] = useState<string | null>(null);

  const { materials, loading, error, refetch } = useMaterials({
    materialType: materialTypeFilter !== 'all' ? materialTypeFilter : undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    search: searchTerm || undefined,
  });

  const { stats } = useInventoryStats();
  const { updateStock } = useInventory();

  const filteredMaterials = useMemo(() => materials ?? [], [materials]);
  const hasActiveFilters = searchTerm.trim().length > 0 || materialTypeFilter !== 'all' || categoryFilter !== 'all';

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingMaterial(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingMaterial(null);
    void refetch();
  };

  const handleArchive = async (materialId: string) => {
    if (!user?.token) {
      toast.error(t('errors.unauthorized'));
      return;
    }

    try {
      setArchiving(materialId);
      await safeInvoke<void>(IPC_COMMANDS.MATERIAL_DELETE, {
        sessionToken: user.token,
        id: materialId,
      });
      toast.success(t('inventory.materialArchived'));
      await refetch();
    } catch (err) {
      toast.error(`${t('errors.generic')}: ${err}`);
    } finally {
      setArchiving(null);
    }
  };

  const handleStockAdjust = (material: Material) => {
    setStockMaterial(material);
    setStockQuantity(0);
    setStockReason('');
    setShowStockDialog(true);
  };

  const submitStockAdjustment = async () => {
    if (!stockMaterial || stockQuantity === 0 || !stockReason.trim()) return;

    try {
      setStockSaving(true);
      await updateStock({
        material_id: stockMaterial.id,
        quantity: stockQuantity,
        transaction_type: stockQuantity > 0 ? 'stock_in' : 'stock_out',
        notes: stockReason,
      });
      toast.success(t('inventory.stockUpdated'));
      setShowStockDialog(false);
      await refetch();
    } catch (err) {
      toast.error(`${t('errors.generic')}: ${err}`);
    } finally {
      setStockSaving(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setMaterialTypeFilter('all');
    setCategoryFilter('all');
  };

  const formatCurrency = (value?: number, currency: string = 'EUR') => {
    if (typeof value !== 'number') {
      return t('common.notDefined');
    }

    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

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
          <Plus className="w-4 h-4 mr-2" />
          {t('inventory.addMaterial')}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-[hsl(var(--rpma-border))]">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingMaterial ? t('inventory.editMaterial') : t('inventory.addNewMaterial')}
            </DialogTitle>
          </DialogHeader>
          <MaterialForm material={editingMaterial} onClose={handleFormClose} />
        </DialogContent>
      </Dialog>

      <Card className="rpma-shell">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground">{t('common.filter')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  aria-label={t('common.search')}
                  placeholder={t('inventory.searchMaterials')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={materialTypeFilter} onValueChange={setMaterialTypeFilter}>
              <SelectTrigger className="w-full lg:w-52">
                <SelectValue placeholder={t('inventory.materialType')} />
              </SelectTrigger>
              <SelectContent className="bg-white border-[hsl(var(--rpma-border))]">
                <SelectItem value="all">{t('inventory.allTypes')}</SelectItem>
                <SelectItem value="ppf_film">{t('inventory.typePpfFilm')}</SelectItem>
                <SelectItem value="adhesive">{t('inventory.typeAdhesive')}</SelectItem>
                <SelectItem value="cleaning_solution">{t('inventory.typeCleaningSolution')}</SelectItem>
                <SelectItem value="tool">{t('inventory.typeTool')}</SelectItem>
                <SelectItem value="consumable">{t('inventory.typeConsumable')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full lg:w-52">
                <SelectValue placeholder={t('inventory.category')} />
              </SelectTrigger>
              <SelectContent className="bg-white border-[hsl(var(--rpma-border))]">
                <SelectItem value="all">{t('inventory.allCategories')}</SelectItem>
                {stats?.materials_by_category &&
                  Object.keys(stats.materials_by_category).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category} ({stats.materials_by_category[category]})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="w-full lg:w-auto">
                <X className="w-4 h-4 mr-2" />
                {t('inventory.clearFilters')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rpma-shell">
        <CardHeader>
          <CardTitle className="text-foreground">
            {t('inventory.materials')} ({filteredMaterials.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMaterials.length === 0 ? (
            <EmptyState
              icon={<Package className="w-10 h-10" />}
              title={t('inventory.noMaterialsFound')}
              description={hasActiveFilters ? t('inventory.adjustFilters') : t('inventory.getStarted')}
              action={!hasActiveFilters ? <Button onClick={handleCreate}>{t('inventory.addFirstMaterial')}</Button> : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="rpma-table-header">
                  <TableHead>{t('inventory.sku')}</TableHead>
                  <TableHead>{t('inventory.name')}</TableHead>
                  <TableHead>{t('inventory.materialType')}</TableHead>
                  <TableHead>{t('inventory.currentStock')}</TableHead>
                  <TableHead>{t('inventory.unitCost')}</TableHead>
                  <TableHead>{t('inventory.status')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.map((material) => (
                  <TableRow key={material.id} className="border-border hover:bg-[hsl(var(--rpma-surface))]/35">
                    <TableCell className="text-foreground font-mono">{material.sku}</TableCell>
                    <TableCell className="text-foreground">{material.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-blue-600 border-blue-300">
                        {getMaterialTypeLabel(material.material_type, t)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-foreground">
                          {material.current_stock} {material.unit_of_measure}
                        </span>
                        {material.current_stock <= (material.minimum_stock || 0) && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">{formatCurrency(material.unit_cost, material.currency)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={material.is_active ? 'default' : 'secondary'}
                        className={material.is_active ? 'bg-[hsl(var(--rpma-teal))] text-white' : ''}
                      >
                        {material.is_active ? t('inventory.active') : t('inventory.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t('common.edit')}
                          title={t('common.edit')}
                          onClick={() => handleEdit(material)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t('inventory.adjustStock')}
                          title={t('inventory.adjustStock')}
                          onClick={() => handleStockAdjust(material)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ArrowUpDown className="w-4 h-4" />
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
                              <Trash2 className="w-4 h-4" />
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
        <DialogContent className="max-w-md bg-white border-[hsl(var(--rpma-border))]">
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
                onChange={(e) => setStockQuantity(parseFloat(e.target.value) || 0)}
                placeholder="+10 / -5"
              />
              <p className="text-xs text-muted-foreground mt-1">{t('inventory.quantityChangeHint')}</p>
            </div>
            <div>
              <Label htmlFor="stock-reason" className="text-foreground">
                {t('inventory.reason')}
              </Label>
              <Textarea
                id="stock-reason"
                value={stockReason}
                onChange={(e) => setStockReason(e.target.value)}
                placeholder={t('inventory.reasonPlaceholder')}
                rows={2}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowStockDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={submitStockAdjustment} disabled={stockSaving || stockQuantity === 0 || !stockReason.trim()}>
                {stockSaving ? t('inventory.saving') : t('inventory.confirmAdjustment')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
