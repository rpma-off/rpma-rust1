import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface MaterialFormData {
  sku: string;
  name: string;
  description: string;
  material_type: string;
  category: string;
  subcategory: string;
  category_id?: string;
  brand: string;
  model: string;
  specifications?: any;
  unit_of_measure: string;
  current_stock: number;
  minimum_stock?: number;
  maximum_stock?: number;
  reorder_point?: number;
  unit_cost?: number;
  currency: string;
  supplier_id?: string;
  supplier_name?: string;
  supplier_sku?: string;
  quality_grade?: string;
  certification?: string;
  expiry_date?: string;
  batch_number?: string;
  storage_location?: string;
  warehouse_id?: string;
  is_active: boolean;
}

export function useMaterialForm(initialMaterial?: any) {
  const [formData, setFormData] = useState<MaterialFormData>({
    sku: '',
    name: '',
    description: '',
    material_type: 'ppf_film',
    category: '',
    subcategory: '',
    category_id: undefined,
    brand: '',
    model: '',
    specifications: undefined,
    unit_of_measure: 'piece',
    current_stock: 0,
    minimum_stock: undefined,
    maximum_stock: undefined,
    reorder_point: undefined,
    unit_cost: undefined,
    currency: 'EUR',
    supplier_id: undefined,
    supplier_name: undefined,
    supplier_sku: undefined,
    quality_grade: undefined,
    certification: undefined,
    expiry_date: undefined,
    batch_number: undefined,
    storage_location: undefined,
    warehouse_id: undefined,
    is_active: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialMaterial) {
      setFormData({
        sku: initialMaterial.sku || '',
        name: initialMaterial.name || '',
        description: initialMaterial.description || '',
        material_type: initialMaterial.material_type || 'ppf_film',
        category: initialMaterial.category || '',
        subcategory: initialMaterial.subcategory || '',
        category_id: initialMaterial.category_id,
        brand: initialMaterial.brand || '',
        model: initialMaterial.model || '',
        specifications: initialMaterial.specifications,
        unit_of_measure: initialMaterial.unit_of_measure || 'piece',
        current_stock: initialMaterial.current_stock || 0,
        minimum_stock: initialMaterial.minimum_stock,
        maximum_stock: initialMaterial.maximum_stock,
        reorder_point: initialMaterial.reorder_point,
        unit_cost: initialMaterial.unit_cost,
        currency: initialMaterial.currency || 'EUR',
        supplier_id: initialMaterial.supplier_id,
        supplier_name: initialMaterial.supplier_name,
        supplier_sku: initialMaterial.supplier_sku,
        quality_grade: initialMaterial.quality_grade,
        certification: initialMaterial.certification,
        expiry_date: initialMaterial.expiry_date,
        batch_number: initialMaterial.batch_number,
        storage_location: initialMaterial.storage_location,
        warehouse_id: initialMaterial.warehouse_id,
        is_active: initialMaterial.is_active ?? true,
      });
    }
  }, [initialMaterial]);

  const updateFormData = (field: keyof MaterialFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveMaterial = async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const requestData = {
        ...formData,
        // Remove undefined values
        minimum_stock: formData.minimum_stock || null,
        maximum_stock: formData.maximum_stock || null,
        reorder_point: formData.reorder_point || null,
        unit_cost: formData.unit_cost || null,
        supplier_id: formData.supplier_id || null,
        supplier_name: formData.supplier_name || null,
        supplier_sku: formData.supplier_sku || null,
        quality_grade: formData.quality_grade || null,
        certification: formData.certification || null,
        expiry_date: formData.expiry_date || null,
        batch_number: formData.batch_number || null,
        storage_location: formData.storage_location || null,
        warehouse_id: formData.warehouse_id || null,
        category_id: formData.category_id || null,
      };

      if (initialMaterial) {
        // Update existing material
        await invoke('material_update', {
          id: initialMaterial.id,
          request: requestData,
          userId: 'current_user', // This should come from auth context
        });
      } else {
        // Create new material
        await invoke('material_create', {
          request: requestData,
          userId: 'current_user', // This should come from auth context
        });
      }

      return true;
    } catch (err) {
      setError(err as string);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    loading,
    error,
    updateFormData,
    saveMaterial,
  };
}