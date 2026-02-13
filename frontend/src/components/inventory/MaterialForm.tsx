'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useMaterialForm } from '@/hooks/useMaterialForm';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useTranslation } from '@/hooks/useTranslation';

interface MaterialFormProps {
  material?: any;
  onClose: () => void;
}

export function MaterialForm({ material, onClose }: MaterialFormProps) {
  const { t } = useTranslation();
  const { formData, loading, error, updateFormData, saveMaterial } = useMaterialForm(material);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await saveMaterial();
    if (success) {
      onClose();
    }
  };

  if (loading && material) {
    return <LoadingSpinner />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sku" className="text-foreground">SKU *</Label>
          <Input
            id="sku"
            value={formData.sku}
            onChange={(e) => updateFormData('sku', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="name" className="text-foreground">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => updateFormData('name', e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description" className="text-foreground">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateFormData('description', e.target.value)}
          rows={3}
        />
      </div>

      {/* Material Type and Category */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="material_type" className="text-foreground">Material Type *</Label>
          <Select
            value={formData.material_type}
            onValueChange={(value) => updateFormData('material_type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('inventory.selectType')} />
            </SelectTrigger>
            <SelectContent className="bg-white border-[hsl(var(--rpma-border))]">
              <SelectItem value="ppf_film">{t('inventory.categoryFilm')}</SelectItem>
              <SelectItem value="adhesive">{t('inventory.adhesive')}</SelectItem>
              <SelectItem value="cleaning_solution">{t('inventory.cleaningSolution')}</SelectItem>
              <SelectItem value="tool">{t('inventory.tool')}</SelectItem>
              <SelectItem value="consumable">{t('inventory.consumable')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="unit_of_measure" className="text-foreground">Unit of Measure *</Label>
          <Select
            value={formData.unit_of_measure}
            onValueChange={(value) => updateFormData('unit_of_measure', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('inventory.selectUnit')} />
            </SelectTrigger>
            <SelectContent className="bg-white border-[hsl(var(--rpma-border))]">
              <SelectItem value="piece">Piece</SelectItem>
              <SelectItem value="meter">Meter</SelectItem>
              <SelectItem value="liter">Liter</SelectItem>
              <SelectItem value="gram">Gram</SelectItem>
              <SelectItem value="roll">Roll</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="currency" className="text-foreground">Currency</Label>
          <Input
            id="currency"
            value={formData.currency}
            onChange={(e) => updateFormData('currency', e.target.value)}
            placeholder="EUR"
          />
        </div>
      </div>

      {/* Inventory Levels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="current_stock" className="text-foreground">Current Stock</Label>
          <Input
            id="current_stock"
            type="number"
            step="0.01"
            value={formData.current_stock}
            onChange={(e) => updateFormData('current_stock', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor="minimum_stock" className="text-foreground">Minimum Stock</Label>
          <Input
            id="minimum_stock"
            type="number"
            step="0.01"
            value={formData.minimum_stock}
            onChange={(e) => updateFormData('minimum_stock', e.target.value ? parseFloat(e.target.value) : undefined)}
          />
        </div>
        <div>
          <Label htmlFor="maximum_stock" className="text-foreground">Maximum Stock</Label>
          <Input
            id="maximum_stock"
            type="number"
            step="0.01"
            value={formData.maximum_stock}
            onChange={(e) => updateFormData('maximum_stock', e.target.value ? parseFloat(e.target.value) : undefined)}
          />
        </div>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="unit_cost" className="text-foreground">Unit Cost</Label>
          <Input
            id="unit_cost"
            type="number"
            step="0.01"
            value={formData.unit_cost}
            onChange={(e) => updateFormData('unit_cost', e.target.value ? parseFloat(e.target.value) : undefined)}
          />
        </div>
        <div>
          <Label htmlFor="reorder_point" className="text-foreground">Reorder Point</Label>
          <Input
            id="reorder_point"
            type="number"
            step="0.01"
            value={formData.reorder_point}
            onChange={(e) => updateFormData('reorder_point', e.target.value ? parseFloat(e.target.value) : undefined)}
          />
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => updateFormData('is_active', checked)}
        />
        <Label htmlFor="is_active" className="text-foreground">Active</Label>
      </div>

      {error && (
        <div className="text-red-500 text-sm">
          Error: {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
        >
          {loading ? 'Saving...' : (material ? 'Update Material' : 'Create Material')}
        </Button>
      </div>
    </form>
  );
}
