'use client';

import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { Plus, Search, Edit, AlertTriangle, Package, Trash2, ArrowUpDown } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMaterials } from '@/hooks/useMaterials';
import { useInventoryStats } from '@/hooks/useInventoryStats';
import { useInventory } from '@/hooks/useInventory';
import { MaterialForm } from './MaterialForm';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';

export function MaterialCatalog() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [materialTypeFilter, setMaterialTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [stockMaterial, setStockMaterial] = useState<any>(null);
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

  const handleEdit = (material: any) => {
    setEditingMaterial(material);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingMaterial(null);
    refetch();
  };

  const handleArchive = async (materialId: string) => {
    try {
      setArchiving(materialId);
      await invoke('material_delete', {
        sessionToken: '',
        id: materialId,
      });
      toast.success(t('inventory.materialArchived'));
      refetch();
    } catch (err) {
      toast.error(`${t('errors.generic')}: ${err}`);
    } finally {
      setArchiving(null);
    }
  };

  const handleStockAdjust = (material: any) => {
    setStockMaterial(material);
    setStockQuantity(0);
    setStockReason('');
    setShowStockDialog(true);
  };

  const submitStockAdjustment = async () => {
    if (!stockMaterial || stockQuantity === 0) return;
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
      refetch();
    } catch (err) {
      toast.error(`${t('errors.generic')}: ${err}`);
    } finally {
      setStockSaving(false);
    }
  };

  const filteredMaterials = materials?.filter(material => {
    const matchesSearch = !searchTerm ||
      material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.sku.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = materialTypeFilter === 'all' ||
      material.material_type === materialTypeFilter;

    const matchesCategory = categoryFilter === 'all' ||
      material.category === categoryFilter;

    return matchesSearch && matchesType && matchesCategory;
  }) || [];

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Card className="rpma-shell">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Erreur lors du chargement des matériaux : {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Catalogue de matériaux</h2>
          <p className="text-muted-foreground">Gérez vos matériaux PPF et fournitures</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un matériau
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-[hsl(var(--rpma-border))]">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editingMaterial ? 'Modifier le matériau' : 'Ajouter un nouveau matériau'}
              </DialogTitle>
            </DialogHeader>
            <MaterialForm
              material={editingMaterial}
              onClose={handleFormClose}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="rpma-shell">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher des matériaux..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={materialTypeFilter} onValueChange={setMaterialTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Type de matériau" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[hsl(var(--rpma-border))]">
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="ppf_film">Film PPF</SelectItem>
                <SelectItem value="adhesive">Adhésif</SelectItem>
                <SelectItem value="cleaning_solution">Solution de nettoyage</SelectItem>
                <SelectItem value="tool">Outil</SelectItem>
                <SelectItem value="consumable">Consommable</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[hsl(var(--rpma-border))]">
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {stats?.materials_by_category && Object.keys(stats.materials_by_category).map(category => (
                  <SelectItem key={category} value={category}>
                    {category} ({stats.materials_by_category[category]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Materials Table */}
      <Card className="rpma-shell">
        <CardHeader>
          <CardTitle className="text-foreground">
            Matériaux ({filteredMaterials.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="rpma-table-header">
                <TableHead>SKU</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Coût unitaire</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map((material) => (
                <TableRow key={material.id} className="border-border">
                  <TableCell className="text-foreground font-mono">
                    {material.sku}
                  </TableCell>
                  <TableCell className="text-foreground">
                    {material.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-blue-500 border-blue-500">
                      {material.material_type.replace('_', ' ')}
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
                  <TableCell className="text-foreground">
                    {material.unit_cost ? `€${material.unit_cost}` : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={material.is_active ? "default" : "secondary"}
                      className={material.is_active ? "bg-[hsl(var(--rpma-teal))] text-white" : ""}
                    >
                      {material.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(material)}
                        className="text-muted-foreground hover:text-foreground"
                        title={t('common.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStockAdjust(material)}
                        className="text-muted-foreground hover:text-foreground"
                        title={t('inventory.adjustStock')}
                      >
                        <ArrowUpDown className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            disabled={archiving === material.id}
                            title={t('inventory.archiveMaterial')}
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

          {filteredMaterials.length === 0 && (
            <div className="rpma-empty">
              <Package className="w-12 h-12 mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun matériau trouvé</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Adjustment Dialog */}
      <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
        <DialogContent className="max-w-md bg-white border-[hsl(var(--rpma-border))]">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {t('inventory.adjustStock')} — {stockMaterial?.name}
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
              <Label htmlFor="stock-qty" className="text-foreground">{t('inventory.quantityChange')}</Label>
              <Input
                id="stock-qty"
                type="number"
                step="0.01"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(parseFloat(e.target.value) || 0)}
                placeholder="+10 ou -5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('inventory.quantityChangeHint')}
              </p>
            </div>
            <div>
              <Label htmlFor="stock-reason" className="text-foreground">{t('inventory.reason')}</Label>
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
              <Button
                onClick={submitStockAdjustment}
                disabled={stockSaving || stockQuantity === 0 || !stockReason.trim()}
              >
                {stockSaving ? t('inventory.saving') : t('inventory.confirmAdjustment')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
