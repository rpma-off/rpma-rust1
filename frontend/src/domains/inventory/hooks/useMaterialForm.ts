import { useState, useEffect } from 'react';
import { useAuth } from '@/domains/auth';
import { inventoryIpc } from '../ipc/inventory.ipc';
import type { JsonValue } from '@/types/json';
import type { MaterialType, UnitOfMeasure } from '../api/types';

interface MaterialFormData {
  sku: string;
  name: string;
  description: string;
  material_type: MaterialType;
  category: string;
  subcategory: string;
  category_id?: string;
  brand: string;
  model: string;
  specifications?: JsonValue;
  unit_of_measure: UnitOfMeasure;
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

export function useMaterialForm(initialMaterial?: Record<string, unknown>) {
  const { user } = useAuth();
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
        sku: (initialMaterial.sku as string) || '',
        name: (initialMaterial.name as string) || '',
        description: (initialMaterial.description as string) || '',
        material_type: (initialMaterial.material_type as MaterialType) || 'ppf_film',
        category: (initialMaterial.category as string) || '',
        subcategory: (initialMaterial.subcategory as string) || '',
        category_id: initialMaterial.category_id as string | undefined,
        brand: (initialMaterial.brand as string) || '',
        model: (initialMaterial.model as string) || '',
        specifications: initialMaterial.specifications as JsonValue | undefined,
        unit_of_measure: (initialMaterial.unit_of_measure as UnitOfMeasure) || 'piece',
        current_stock: (initialMaterial.current_stock as number | undefined) ?? 0,
        minimum_stock: initialMaterial.minimum_stock as number | undefined,
        maximum_stock: initialMaterial.maximum_stock as number | undefined,
        reorder_point: initialMaterial.reorder_point as number | undefined,
        unit_cost: initialMaterial.unit_cost as number | undefined,
        currency: (initialMaterial.currency as string) || 'EUR',
        supplier_id: initialMaterial.supplier_id as string | undefined,
        supplier_name: initialMaterial.supplier_name as string | undefined,
        supplier_sku: initialMaterial.supplier_sku as string | undefined,
        quality_grade: initialMaterial.quality_grade as string | undefined,
        certification: initialMaterial.certification as string | undefined,
        expiry_date: initialMaterial.expiry_date as string | undefined,
        batch_number: initialMaterial.batch_number as string | undefined,
        storage_location: initialMaterial.storage_location as string | undefined,
        warehouse_id: initialMaterial.warehouse_id as string | undefined,
        is_active: (initialMaterial.is_active as boolean) ?? true,
      });
    }
  }, [initialMaterial]);

  const updateFormData = (field: keyof MaterialFormData, value: MaterialFormData[keyof MaterialFormData]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveMaterial = async (): Promise<boolean> => {
    if (!user?.token) {
      setError('Authentication required');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const requestData = {
        ...formData,
        minimum_stock: formData.minimum_stock ?? undefined,
        maximum_stock: formData.maximum_stock ?? undefined,
        reorder_point: formData.reorder_point ?? undefined,
        unit_cost: formData.unit_cost ?? undefined,
        supplier_id: formData.supplier_id || undefined,
        supplier_name: formData.supplier_name || undefined,
        supplier_sku: formData.supplier_sku || undefined,
        quality_grade: formData.quality_grade || undefined,
        certification: formData.certification || undefined,
        expiry_date: formData.expiry_date || undefined,
        batch_number: formData.batch_number || undefined,
        storage_location: formData.storage_location || undefined,
        warehouse_id: formData.warehouse_id || undefined,
        category_id: formData.category_id || undefined,
        specifications: formData.specifications ?? undefined,
      };

      if (initialMaterial) {
        const materialId = typeof initialMaterial.id === 'string' ? initialMaterial.id : '';
        if (!materialId) {
          setError('Invalid material id');
          return false;
        }

        await inventoryIpc.material.update(materialId, requestData, user.token);
      } else {
        await inventoryIpc.material.create(requestData, user.token);
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
