import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface Material {
  id: string;
  sku: string;
  name: string;
  description?: string;
  material_type: string;
  category?: string;
  subcategory?: string;
  category_id?: string;
  brand?: string;
  model?: string;
  specifications?: Record<string, unknown>;
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
  serial_numbers?: string[];
  is_active: boolean;
  is_discontinued: boolean;
  storage_location?: string;
  warehouse_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  synced: boolean;
  last_synced_at?: string;
}

interface UseMaterialsOptions {
  materialType?: string;
  category?: string;
  activeOnly?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export function useMaterials(options: UseMaterialsOptions = {}) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<Material[]>('material_list', {
        materialType: options.materialType,
        category: options.category,
        activeOnly: options.activeOnly ?? true,
        limit: options.limit,
        offset: options.offset,
      });

      // Apply client-side search if needed
      let filteredMaterials = result;
      if (options.search) {
        const searchLower = options.search.toLowerCase();
        filteredMaterials = result.filter((material: Material) =>
          material.name.toLowerCase().includes(searchLower) ||
          material.sku.toLowerCase().includes(searchLower) ||
          material.description?.toLowerCase().includes(searchLower)
        );
      }

      setMaterials(filteredMaterials);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    options.materialType,
    options.category,
    options.activeOnly,
    options.search,
    options.limit,
    options.offset,
  ]);

  return {
    materials,
    loading,
    error,
    refetch: fetchMaterials,
  };
}