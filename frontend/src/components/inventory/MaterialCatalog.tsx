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

export function MaterialCatalog() {
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
      <Card className="bg-border-800 border-border-700">
        <CardContent className="p-6">
          <div className="text-center text-border-300">
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
          <h2 className="text-2xl font-bold text-foreground">Material Catalog</h2>
          <p className="text-border-300">Manage your PPF materials and supplies</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/80">
              <Plus className="w-4 h-4 mr-2" />
              Add Material
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-border-800 border-border-700">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editingMaterial ? 'Edit Material' : 'Add New Material'}
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
      <Card className="bg-border-800 border-border-700">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-border-400" />
                <Input
                  placeholder="Search materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-border-900 border-border-600 text-foreground"
                />
              </div>
            </div>
            <Select value={materialTypeFilter} onValueChange={setMaterialTypeFilter}>
              <SelectTrigger className="w-full md:w-48 bg-border-900 border-border-600">
                <SelectValue placeholder="Material Type" />
              </SelectTrigger>
              <SelectContent className="bg-border-800 border-border-700">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="ppf_film">PPF Film</SelectItem>
                <SelectItem value="adhesive">Adhesive</SelectItem>
                <SelectItem value="cleaning_solution">Cleaning Solution</SelectItem>
                <SelectItem value="tool">Tool</SelectItem>
                <SelectItem value="consumable">Consumable</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48 bg-border-900 border-border-600">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-border-800 border-border-700">
                <SelectItem value="all">All Categories</SelectItem>
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
      <Card className="bg-border-800 border-border-700">
        <CardHeader>
          <CardTitle className="text-foreground">
            Materials ({filteredMaterials.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border-700">
                <TableHead className="text-border-300">SKU</TableHead>
                <TableHead className="text-border-300">Name</TableHead>
                <TableHead className="text-border-300">Type</TableHead>
                <TableHead className="text-border-300">Stock</TableHead>
                <TableHead className="text-border-300">Unit Cost</TableHead>
                <TableHead className="text-border-300">Status</TableHead>
                <TableHead className="text-border-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map((material) => (
                <TableRow key={material.id} className="border-border-700">
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
                      className={material.is_active ? "bg-accent" : ""}
                    >
                      {material.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(material)}
                      className="text-border-300 hover:text-foreground"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredMaterials.length === 0 && (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-border-400 mx-auto mb-4" />
              <p className="text-border-400">No materials found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}