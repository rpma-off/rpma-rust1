import { useState, useEffect, useCallback } from 'react';
import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import { useAuth } from '@/lib/auth/compatibility';

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

const AUTH_ERROR_MESSAGE = 'Authentication required';

export function useMaterials(options: UseMaterialsOptions = {}) {
  const { user } = useAuth();
  const sessionToken = user?.token;
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMaterials = useCallback(async () => {
    if (!sessionToken) {
      setMaterials([]);
      setError(AUTH_ERROR_MESSAGE);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await safeInvoke<Material[]>(IPC_COMMANDS.MATERIAL_LIST, {
        sessionToken,
        materialType: options.materialType,
        category: options.category,
        activeOnly: options.activeOnly ?? true,
        limit: options.limit,
        offset: options.offset,
      });

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
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [options.activeOnly, options.category, options.limit, options.materialType, options.offset, options.search, sessionToken]);

  useEffect(() => {
    void fetchMaterials();
  }, [fetchMaterials]);

  return {
    materials,
    loading,
    error,
    refetch: fetchMaterials,
  };
}
