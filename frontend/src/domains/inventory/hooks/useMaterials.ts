'use client';

import { useMemo } from 'react';
import { useInventory } from '../api/useInventory';
import type { Material, MaterialType } from '../api/types';

interface UseMaterialsOptions {
  materialType?: MaterialType;
  category?: string;
  activeOnly?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export function useMaterials(options: UseMaterialsOptions = {}) {
  const inventory = useInventory({
    material_type: options.materialType ?? null,
    category: options.category ?? null,
    active_only: options.activeOnly ?? true,
    limit: options.limit,
    offset: options.offset,
  });

  const materials = useMemo(() => {
    if (!options.search) {
      return inventory.materials;
    }
    const searchLower = options.search.toLowerCase();
    return inventory.materials.filter((material: Material) =>
      material.name.toLowerCase().includes(searchLower) ||
      material.sku.toLowerCase().includes(searchLower) ||
      material.description?.toLowerCase().includes(searchLower)
    );
  }, [inventory.materials, options.search]);

  return {
    materials,
    loading: inventory.loading,
    error: inventory.error,
    refetch: inventory.refetch,
  };
}
