'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useMaterialForm } from '@/hooks/useMaterialForm';
import { useTranslation } from '@/hooks/useTranslation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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
          <Label htmlFor="sku" className="text-foreground">{t('inventory.skuLabel')} *</Label>
          <Input
            id="sku"
            value={formData.sku}
            onChange={(e) => updateFormData('sku', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="name" className="text-foreground">{t('inventory.nameLabel')} *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => updateFormData('name', e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description" className="text-foreground">{t('inventory.description')}</Label>
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
          <Label htmlFor="material_type" className="text-foreground">{t('inventory.materialType')} *</Label>
          <Select
            value={formData.material_type}
            onValueChange={(value) => updateFormData('material_type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('inventory.selectType')} />
            </SelectTrigger>
            <SelectContent className="bg-white border-[hsl(var(--rpma-border))]">
              <SelectItem value="ppf_film">{t('inventory.typePpfFilm')}</SelectItem>
              <SelectItem value="adhesive">{t('inventory.typeAdhesive')}</SelectItem>
              <SelectItem value="cleaning_solution">{t('inventory.typeCleaningSolution')}</SelectItem>
              <SelectItem value="tool">{t('inventory.typeTool')}</SelectItem>
              <SelectItem value="consumable">{t('inventory.typeConsumable')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="unit_of_measure" className="text-foreground">{t('inventory.unitOfMeasure')} *</Label>
          <Select
            value={formData.unit_of_measure}
            onValueChange={(value) => updateFormData('unit_of_measure', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('inventory.selectUnit')} />
            </SelectTrigger>
            <SelectContent className="bg-white border-[hsl(var(--rpma-border))]">
              <SelectItem value="piece">{t('inventory.unitPiece')}</SelectItem>
              <SelectItem value="meter">{t('inventory.unitMeter')}</SelectItem>
              <SelectItem value="liter">{t('inventory.unitLiter')}</SelectItem>
              <SelectItem value="gram">{t('inventory.unitGram')}</SelectItem>
              <SelectItem value="roll">{t('inventory.unitRoll')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="currency" className="text-foreground">{t('inventory.currency')}</Label>
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
          <Label htmlFor="current_stock" className="text-foreground">{t('inventory.currentStock')}</Label>
          <Input
            id="current_stock"
            type="number"
            step="0.01"
            value={formData.current_stock}
            onChange={(e) => updateFormData('current_stock', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor="minimum_stock" className="text-foreground">{t('inventory.minimumStock')}</Label>
          <Input
            id="minimum_stock"
            type="number"
            step="0.01"
            value={formData.minimum_stock}
            onChange={(e) => updateFormData('minimum_stock', e.target.value ? parseFloat(e.target.value) : undefined)}
          />
        </div>
        <div>
          <Label htmlFor="maximum_stock" className="text-foreground">{t('inventory.maximumStock')}</Label>
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
          <Label htmlFor="unit_cost" className="text-foreground">{t('inventory.unitCost')}</Label>
          <Input
            id="unit_cost"
            type="number"
            step="0.01"
            value={formData.unit_cost}
            onChange={(e) => updateFormData('unit_cost', e.target.value ? parseFloat(e.target.value) : undefined)}
          />
        </div>
        <div>
          <Label htmlFor="reorder_point" className="text-foreground">{t('inventory.reorderPoint')}</Label>
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
        <Label htmlFor="is_active" className="text-foreground">{t('inventory.active')}</Label>
      </div>

      {error && (
        <div className="text-red-500 text-sm">
          {t('errors.generic')}: {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          disabled={loading}
        >
          {loading ? t('inventory.saving') : (material ? t('inventory.updateMaterial') : t('inventory.createMaterialBtn'))}
        </Button>
      </div>
    </form>
  );
}
