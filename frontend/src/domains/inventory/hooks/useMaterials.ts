'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/domains/auth';
import { inventoryIpc } from '../ipc/inventory.ipc';
import type { Material, MaterialType } from '../api/types';

interface UseMaterialsOptions {
  materialType?: MaterialType;
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
      const result = await inventoryIpc.material.list(sessionToken, {
        material_type: options.materialType ?? null,
        category: options.category ?? null,
        active_only: options.activeOnly ?? true,
        limit: options.limit,
        offset: options.offset,
      });

      let filteredMaterials = result.data || [];
      if (options.search) {
        const searchLower = options.search.toLowerCase();
        filteredMaterials = filteredMaterials.filter((material: Material) =>
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
