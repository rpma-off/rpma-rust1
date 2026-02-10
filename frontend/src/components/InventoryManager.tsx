'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { VirtualizedTable } from '@/components/ui/virtualized-table';
import { StockLevelIndicator } from './StockLevelIndicator';
import { MaterialForm } from './MaterialForm';
import { useInventory } from '@/hooks/useInventory';
import { useInventoryStats } from '@/hooks/useInventoryStats';
import { Material, MaterialType, UnitOfMeasure } from '@/lib/inventory';
import { 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Package, 
  AlertTriangle, 
  XCircle,
  TrendingUp,
  Edit,
  Eye,
  Download,
  Upload
} from 'lucide-react';

interface InventoryManagerProps {
  className?: string;
}

export function InventoryManager({ className }: InventoryManagerProps) {
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
    getMaterial,
    getMaterialBySku
  } = useInventory({
    material_type: selectedType,
    category: selectedCategory,
    active_only: !showInactive,
    limit: 100,
  });

  const { stats: inventoryStats } = useInventoryStats();

  // Filter materials based on search term
  const filteredMaterials = materials.filter(material => 
    material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const materialTypeOptions = [
    { value: 'ppf_film' as MaterialType, label: 'PPF Film' },
    { value: 'adhesive' as MaterialType, label: 'Adhesive' },
    { value: 'cleaning_solution' as MaterialType, label: 'Cleaning Solution' },
    { value: 'tool' as MaterialType, label: 'Tool' },
    { value: 'consumable' as MaterialType, label: 'Consumable' },
  ];

  const getUniqueCategories = () => {
    const categories = new Set<string>();
    materials.forEach(material => {
      if (material.category) {
        categories.add(material.category);
      }
    });
    return Array.from(categories).sort();
  };

  const handleEdit = async (material: Material) => {
    setSelectedMaterial(material);
    setIsEditDialogOpen(true);
  };

  const handleViewDetails = (material: Material) => {
    setSelectedMaterial(material);
    setIsDetailsDialogOpen(true);
  };

  const handleDelete = (material: Material) => {
    setDeletingMaterial(material);
  };

  const confirmDelete = async () => {
    if (!deletingMaterial) return;
    // Implementation would depend on the actual delete command
    // For now, we'll just close the dialog and refetch
    setDeletingMaterial(null);
    await refetch();
  };

  const exportInventory = () => {
    // Export functionality would be implemented here
    console.log('Exporting inventory...');
  };

  const importInventory = () => {
    // Import functionality would be implemented here
    console.log('Importing inventory...');
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStockStatusColor = (material: Material) => {
    if (material.current_stock <= 0) return 'text-red-600';
    if (material.is_expired) return 'text-red-600';
    if (material.is_discontinued) return 'text-gray-500';
    if (material.is_low_stock) return 'text-yellow-600';
    return 'text-green-600';
  };

  const tableColumns = [
    {
      key: 'sku',
      header: 'SKU',
      render: (material: Material) => (
        <span className="font-mono text-sm">{material.sku}</span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (material: Material) => (
        <div className="max-w-[200px]">
          <div className="font-medium truncate">{material.name}</div>
          {material.brand && (
            <div className="text-sm text-muted-foreground">{material.brand}</div>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (material: Material) => (
        <Badge variant="outline" className="capitalize">
          {material.material_type.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'stock',
      header: 'Stock Level',
      render: (material: Material) => (
        <div className="min-w-[120px]">
          <StockLevelIndicator material={material} />
        </div>
      ),
    },
    {
      key: 'unit_cost',
      header: 'Unit Cost',
      render: (material: Material) => (
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
      header: 'Location',
      render: (material: Material) => (
        <div className="max-w-[100px]">
          {material.storage_location ? (
            <span className="text-sm truncate">{material.storage_location}</span>
          ) : (
            <span className="text-muted-foreground text-sm">N/A</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (material: Material) => {
        const getStatusIcon = () => {
          if (material.is_expired) return <XCircle className="h-4 w-4" />;
          if (material.is_low_stock) return <AlertTriangle className="h-4 w-4" />;
          if (material.is_discontinued) return <TrendingUp className="h-4 w-4" />;
          return <TrendingUp className="h-4 w-4" />;
        };

        const getStatusText = () => {
          if (material.is_expired) return 'Expired';
          if (material.is_discontinued) return 'Discontinued';
          if (material.is_low_stock) return 'Low';
          return 'OK';
        };

        return (
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className={`text-sm ${getStockStatusColor(material)}`}>
              {getStatusText()}
            </span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (material: Material) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetails(material)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(material)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inventory Management</h2>
          <p className="text-muted-foreground">
            Manage your material inventory and track stock levels
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={importInventory}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button
            variant="outline"
            onClick={exportInventory}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Material
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Material</DialogTitle>
              </DialogHeader>
              <MaterialForm
                onSuccess={(material) => {
                  setIsCreateDialogOpen(false);
                  refetch();
                }}
                onCancel={() => setIsCreateDialogOpen(false)}
                userId="current-user" // This should come from auth context
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_materials || 0}</div>
            <p className="text-xs text-muted-foreground">Active inventory items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.low_stock_materials || 0}
            </div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expired Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.expired_materials || 0}
            </div>
            <p className="text-xs text-muted-foreground">Should be removed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.total_value 
                ? formatCurrency(stats.total_value, 'EUR')
                : '€0.00'
              }
            </div>
            <p className="text-xs text-muted-foreground">Current inventory value</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {lowStockMaterials.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {lowStockMaterials.length} material(s) are running low on stock. 
            Consider reordering soon to avoid shortages.
          </AlertDescription>
        </Alert>
      )}

      {expiredMaterials.length > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {expiredMaterials.length} material(s) have expired and should be removed from inventory.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select
              value={selectedType || ''}
              onValueChange={(value) => setSelectedType(value as MaterialType | null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                {materialTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedCategory || ''}
              onValueChange={(value) => setSelectedCategory(value || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {getUniqueCategories().map((category) => (
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
                onClick={() => setShowInactive(!showInactive)}
                className={showInactive ? 'bg-secondary' : ''}
              >
                Show Inactive
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Materials ({filteredMaterials.length})
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
          ) : filteredMaterials.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No materials found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedType || selectedCategory
                  ? 'Try adjusting your filters or search terms.'
                  : 'Get started by adding your first material to the inventory.'
                }
              </p>
              {!searchTerm && !selectedType && !selectedCategory && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Material
                </Button>
              )}
            </div>
          ) : (
            <VirtualizedTable
              data={filteredMaterials}
              columns={tableColumns}
              rowHeight={60}
              maxHeight={500}
            />
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Material</DialogTitle>
          </DialogHeader>
          {selectedMaterial && (
            <MaterialForm
              material={selectedMaterial}
              onSuccess={(material) => {
                setIsEditDialogOpen(false);
                setSelectedMaterial(null);
                refetch();
              }}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedMaterial(null);
              }}
              userId="current-user" // This should come from auth context
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Material Details</DialogTitle>
          </DialogHeader>
          {selectedMaterial && (
            <StockLevelIndicator
              material={selectedMaterial}
              showDetails={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deletingMaterial}
        onOpenChange={(open) => !open && setDeletingMaterial(null)}
        title="Delete Material"
        description={`Are you sure you want to delete "${deletingMaterial?.name}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}