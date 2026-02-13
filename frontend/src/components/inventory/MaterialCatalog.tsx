'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, AlertTriangle, Package } from 'lucide-react';
import { useMaterials } from '@/hooks/useMaterials';
import { useInventoryStats } from '@/hooks/useInventoryStats';
import { MaterialForm } from './MaterialForm';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useTranslation } from '@/hooks/useTranslation';

export function MaterialCatalog() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [materialTypeFilter, setMaterialTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);

  const { materials, loading, error, refetch } = useMaterials({
    materialType: materialTypeFilter !== 'all' ? materialTypeFilter : undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    search: searchTerm || undefined,
  });

  const { stats } = useInventoryStats();

  const handleEdit = (material: any) => {
    setEditingMaterial(material);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingMaterial(null);
    refetch();
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
            Error loading materials: {error}
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
          <h2 className="text-2xl font-bold text-foreground">{t('inventory.materialCatalog')}</h2>
          <p className="text-muted-foreground">{t('inventory.manageMaterials')}</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t('inventory.createMaterial')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-[hsl(var(--rpma-border))]">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editingMaterial ? t('inventory.editMaterial') : t('inventory.createMaterial')}
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
                  placeholder={t('inventory.searchMaterials')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={materialTypeFilter} onValueChange={setMaterialTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={t('inventory.materialType')} />
              </SelectTrigger>
              <SelectContent className="bg-white border-[hsl(var(--rpma-border))]">
                <SelectItem value="all">{t('inventory.allTypes')}</SelectItem>
                <SelectItem value="ppf_film">{t('inventory.categoryFilm')}</SelectItem>
                <SelectItem value="adhesive">{t('inventory.adhesive')}</SelectItem>
                <SelectItem value="cleaning_solution">{t('inventory.cleaningSolution')}</SelectItem>
                <SelectItem value="tool">{t('inventory.tool')}</SelectItem>
                <SelectItem value="consumable">{t('inventory.consumable')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={t('inventory.category')} />
              </SelectTrigger>
              <SelectContent className="bg-white border-[hsl(var(--rpma-border))]">
                <SelectItem value="all">{t('inventory.allCategories')}</SelectItem>
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
            {t('inventory.materials')} ({filteredMaterials.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="rpma-table-header">
                <TableHead>{t('inventory.sku')}</TableHead>
                <TableHead>{t('inventory.name')}</TableHead>
                <TableHead>{t('inventory.type')}</TableHead>
                <TableHead>{t('inventory.stock')}</TableHead>
                <TableHead>{t('inventory.unitCost')}</TableHead>
                <TableHead>{t('inventory.status')}</TableHead>
                <TableHead>{t('inventory.actions')}</TableHead>
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
                      {material.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(material)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredMaterials.length === 0 && (
            <div className="rpma-empty">
              <Package className="w-12 h-12 mx-auto mb-4" />
              <p className="text-muted-foreground">{t('inventory.noMaterials')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
