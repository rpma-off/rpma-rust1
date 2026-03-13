'use client';

import { useState, useEffect } from 'react';
import type { JsonValue } from '@/types/json';
import { useAuth } from '@/shared/hooks/useAuth';
import { inventoryIpc } from '../ipc/inventory.ipc';
import type { Material, MaterialType, UnitOfMeasure } from '../api/types';
import type { CreateMaterialRequest } from '../server';

// Must stay in sync with the Rust UnitOfMeasure enum in src-tauri/src/models
const VALID_UNITS: UnitOfMeasure[] = ['piece', 'meter', 'liter', 'gram', 'roll'];

export function normalizeMaterialRequest<T extends { unit_of_measure?: UnitOfMeasure | string }>(
  data: T
): Omit<T, 'unit_of_measure'> & { unit_of_measure?: UnitOfMeasure } {
  const unit = data.unit_of_measure;
  return {
    ...data,
    unit_of_measure: (unit && VALID_UNITS.includes(unit as UnitOfMeasure) ? unit as UnitOfMeasure : undefined),
  };
}

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

export function useMaterialForm(initialMaterial?: Material | null) {
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
        sku: initialMaterial.sku || '',
        name: initialMaterial.name || '',
        description: initialMaterial.description || '',
        material_type: initialMaterial.material_type || 'ppf_film',
        category: initialMaterial.category || '',
        subcategory: initialMaterial.subcategory || '',
        category_id: initialMaterial.category_id,
        brand: initialMaterial.brand || '',
        model: initialMaterial.model || '',
        specifications: initialMaterial.specifications as JsonValue | undefined,
        unit_of_measure: initialMaterial.unit_of_measure || 'piece',
        current_stock: initialMaterial.current_stock ?? 0,
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

    // Guard: show user-facing error and abort early (required for create path where unit is mandatory).
    // normalizeMaterialRequest below provides defense-in-depth for the update path.
    if (!formData.unit_of_measure || !VALID_UNITS.includes(formData.unit_of_measure)) {
      setError('Unit of measure is required');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const requestData = normalizeMaterialRequest({
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
      });

      if (initialMaterial) {
        const materialId = initialMaterial.id;
        if (!materialId) {
          setError('Invalid material id');
          return false;
        }

        await inventoryIpc.material.update(materialId, requestData);
      } else {
        await inventoryIpc.material.create(requestData as CreateMaterialRequest);
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
