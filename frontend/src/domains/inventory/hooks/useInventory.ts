'use client';

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryKeys } from '@/lib/query-keys';
import { canAccessInventory } from '@/types/auth.types';
import { useAuth } from '@/shared/hooks/useAuth';
import { inventoryIpc } from '../ipc/inventory.ipc';
import type {
  Material,
  MaterialConsumption,
  MaterialStats,
  InterventionMaterialSummary,
} from '../api/types';
import type {
  CreateMaterialRequest,
  UpdateStockRequest,
  RecordConsumptionRequest,
  InventoryQuery,
} from '../ipc/inventory-request.types';
import {
  AUTH_ERROR_MESSAGE,
  PERMISSION_ERROR_MESSAGE,
  getInventoryAuthError,
} from './inventory-query-auth';

export type {
  CreateMaterialRequest,
  UpdateStockRequest,
  RecordConsumptionRequest,
  InventoryQuery,
};

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function extractMaterialList(result: unknown): Material[] {
  if (Array.isArray(result)) {
    return result as Material[];
  }

  if (result && typeof result === 'object' && 'data' in result) {
    const data = (result as { data?: unknown }).data;
    if (Array.isArray(data)) {
      return data as Material[];
    }
  }

  return [];
}

export function useInventory(query?: InventoryQuery) {
  const { user } = useAuth();
  const sessionToken = user?.token;
  const hasInventoryAccess = canAccessInventory(user ?? null);
  const queryClient = useQueryClient();

  const normalizedQuery = useMemo(
    () => ({
      material_type: query?.material_type ?? undefined,
      category: query?.category ?? undefined,
      active_only: query?.active_only,
      limit: query?.limit,
      offset: query?.offset,
    }),
    [query?.active_only, query?.category, query?.limit, query?.material_type, query?.offset],
  );

  const hasMaterialFilters = useMemo(
    () => Object.values(normalizedQuery).some((value) => value !== undefined),
    [normalizedQuery],
  );

  const authError = getInventoryAuthError(sessionToken, hasInventoryAccess);

  const dashboardQuery = useQuery({
    queryKey: inventoryKeys.dashboard(),
    queryFn: async () => {
      const t0 = performance.now();
      const data = await inventoryIpc.getDashboardData();
      const elapsed = performance.now() - t0;
      if (elapsed > 200) console.warn(`[Perf] fetchDashboard slow: ${elapsed.toFixed(1)}ms`);
      return data;
    },
    enabled: !authError,
    retry: false,
  });

  const materialsQuery = useQuery({
    queryKey: [...inventoryKeys.materials(), normalizedQuery],
    queryFn: async () => extractMaterialList(await inventoryIpc.material.list(normalizedQuery)),
    enabled: !authError && hasMaterialFilters,
    retry: false,
  });

  const invalidateInventoryData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: inventoryKeys.dashboard() }),
      queryClient.invalidateQueries({ queryKey: inventoryKeys.materials() }),
    ]);
  }, [queryClient]);

  const createMaterialMutation = useMutation({
    mutationFn: async (request: CreateMaterialRequest) => {
      if (!sessionToken) {
        throw new Error(AUTH_ERROR_MESSAGE);
      }
      if (!hasInventoryAccess) {
        throw new Error(PERMISSION_ERROR_MESSAGE);
      }

      return inventoryIpc.material.create(request);
    },
    onSuccess: invalidateInventoryData,
  });

  const updateMaterialMutation = useMutation({
    mutationFn: async ({ id, request }: { id: string; request: CreateMaterialRequest }) => {
      if (!sessionToken) {
        throw new Error(AUTH_ERROR_MESSAGE);
      }
      if (!hasInventoryAccess) {
        throw new Error(PERMISSION_ERROR_MESSAGE);
      }

      return inventoryIpc.material.update(id, request);
    },
    onSuccess: invalidateInventoryData,
  });

  const updateStockMutation = useMutation({
    mutationFn: async (request: UpdateStockRequest) => {
      if (!sessionToken) {
        throw new Error(AUTH_ERROR_MESSAGE);
      }
      if (!hasInventoryAccess) {
        throw new Error(PERMISSION_ERROR_MESSAGE);
      }

      return inventoryIpc.stock.updateStock(request);
    },
    onSuccess: invalidateInventoryData,
  });

  const recordConsumptionMutation = useMutation({
    mutationFn: async (request: RecordConsumptionRequest) => {
      if (!sessionToken) {
        throw new Error(AUTH_ERROR_MESSAGE);
      }
      if (!hasInventoryAccess) {
        throw new Error(PERMISSION_ERROR_MESSAGE);
      }

      await inventoryIpc.consumption.recordConsumption(request);
    },
    onSuccess: invalidateInventoryData,
  });

  const getMaterial = useCallback(async (id: string): Promise<Material | null> => {
    if (!sessionToken) {
      throw new Error(AUTH_ERROR_MESSAGE);
    }
    if (!hasInventoryAccess) {
      throw new Error(PERMISSION_ERROR_MESSAGE);
    }

    return inventoryIpc.material.get(id);
  }, [hasInventoryAccess, sessionToken]);

  const getMaterialBySku = useCallback(async (sku: string): Promise<Material | null> => {
    if (!sessionToken) {
      throw new Error(AUTH_ERROR_MESSAGE);
    }
    if (!hasInventoryAccess) {
      throw new Error(PERMISSION_ERROR_MESSAGE);
    }

    return inventoryIpc.getMaterialBySku(sku);
  }, [hasInventoryAccess, sessionToken]);

  const getInterventionConsumption = useCallback(async (interventionId: string): Promise<MaterialConsumption[]> => {
    if (!sessionToken) {
      throw new Error(AUTH_ERROR_MESSAGE);
    }
    if (!hasInventoryAccess) {
      throw new Error(PERMISSION_ERROR_MESSAGE);
    }

    return inventoryIpc.getInterventionConsumption(interventionId);
  }, [hasInventoryAccess, sessionToken]);

  const getInterventionSummary = useCallback(async (interventionId: string): Promise<InterventionMaterialSummary> => {
    if (!sessionToken) {
      throw new Error(AUTH_ERROR_MESSAGE);
    }
    if (!hasInventoryAccess) {
      throw new Error(PERMISSION_ERROR_MESSAGE);
    }

    return inventoryIpc.getInterventionSummary(interventionId);
  }, [hasInventoryAccess, sessionToken]);

  const getMaterialStats = useCallback(async (): Promise<MaterialStats> => {
    if (!sessionToken) {
      throw new Error(AUTH_ERROR_MESSAGE);
    }
    if (!hasInventoryAccess) {
      throw new Error(PERMISSION_ERROR_MESSAGE);
    }

    return inventoryIpc.getMaterialStats();
  }, [hasInventoryAccess, sessionToken]);

  const deleteMaterial = useCallback(async (id: string) => {
    if (!sessionToken) {
      throw new Error(AUTH_ERROR_MESSAGE);
    }
    if (!hasInventoryAccess) {
      throw new Error(PERMISSION_ERROR_MESSAGE);
    }

    await inventoryIpc.material.delete(id);
    await invalidateInventoryData();
  }, [hasInventoryAccess, invalidateInventoryData, sessionToken]);

  const materials = authError
    ? []
    : hasMaterialFilters
      ? (materialsQuery.data ?? [])
      : (dashboardQuery.data?.materials ?? []);

  const error = authError
    ?? (materialsQuery.error ? getErrorMessage(materialsQuery.error) : null)
    ?? (dashboardQuery.error ? getErrorMessage(dashboardQuery.error) : null);

  const loading = authError
    ? false
    : dashboardQuery.isLoading || (hasMaterialFilters && materialsQuery.isLoading);

  return {
    materials,
    loading,
    error,
    stats: authError ? null : (dashboardQuery.data?.stats ?? null),
    lowStockMaterials: authError ? [] : (dashboardQuery.data?.low_stock.items ?? []),
    expiredMaterials: authError ? [] : (dashboardQuery.data?.expired ?? []),
    createMaterial: (request: CreateMaterialRequest, _userId?: string) =>
      createMaterialMutation.mutateAsync(request),
    updateMaterial: (id: string, request: CreateMaterialRequest, _userId?: string) =>
      updateMaterialMutation.mutateAsync({ id, request }),
    deleteMaterial,
    updateStock: (request: UpdateStockRequest) => updateStockMutation.mutateAsync(request),
    recordConsumption: (request: RecordConsumptionRequest) =>
      recordConsumptionMutation.mutateAsync(request),
    getMaterial,
    getMaterialBySku,
    getInterventionConsumption,
    getInterventionSummary,
    getMaterialStats,
    refetch: async () => {
      if (!authError) {
        await (hasMaterialFilters ? materialsQuery.refetch() : dashboardQuery.refetch());
      }
    },
    refetchStats: async () => {
      if (!authError) {
        await dashboardQuery.refetch();
      }
    },
    refetchLowStock: async () => {
      if (!authError) {
        await dashboardQuery.refetch();
      }
    },
    refetchExpired: async () => {
      if (!authError) {
        await dashboardQuery.refetch();
      }
    },
  };
}
