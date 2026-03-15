'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { canAccessInventory } from '@/types/auth.types';
import { useAuth } from '@/shared/hooks/useAuth';
import { inventoryIpc } from '../ipc/inventory.ipc';
import type {
  Material,
  MaterialConsumption,
  MaterialStats,
  InventoryStats,
  InterventionMaterialSummary,
  LowStockMaterial,
} from '../api/types';
import type {
  CreateMaterialRequest,
  UpdateStockRequest,
  RecordConsumptionRequest,
  InventoryQuery,
} from '../ipc/inventory-request.types';

export type {
  CreateMaterialRequest,
  UpdateStockRequest,
  RecordConsumptionRequest,
  InventoryQuery,
};

const AUTH_ERROR_MESSAGE = 'Authentication required';
const PERMISSION_ERROR_MESSAGE = 'Insufficient permissions for inventory access';

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
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [lowStockMaterials, setLowStockMaterials] = useState<LowStockMaterial[]>([]);
  const [expiredMaterials, setExpiredMaterials] = useState<Material[]>([]);

  const fetchMaterials = useCallback(async () => {
    if (!sessionToken) {
      setMaterials([]);
      setError(AUTH_ERROR_MESSAGE);
      setLoading(false);
      return;
    }

    if (!hasInventoryAccess) {
      setMaterials([]);
      setError(PERMISSION_ERROR_MESSAGE);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await inventoryIpc.material.list({
        material_type: query?.material_type ?? undefined,
        category: query?.category ?? undefined,
        active_only: query?.active_only,
        limit: query?.limit,
        offset: query?.offset,
      });
      setMaterials(extractMaterialList(result));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [hasInventoryAccess, query?.active_only, query?.category, query?.limit, query?.material_type, query?.offset, sessionToken]);

  const fetchStats = useCallback(async () => {
    if (!sessionToken || !hasInventoryAccess) {
      setStats(null);
      return;
    }

    try {
      const result = await inventoryIpc.getInventoryStats();
      setStats(result);
    } catch (err) {
      console.error('Failed to fetch inventory stats:', err);
    }
  }, [hasInventoryAccess, sessionToken]);

  const fetchLowStock = useCallback(async () => {
    if (!sessionToken || !hasInventoryAccess) {
      setLowStockMaterials([]);
      return;
    }

    try {
      const result = await inventoryIpc.reporting.getLowStockMaterials();
      setLowStockMaterials(result.items);
    } catch (err) {
      console.error('Failed to fetch low stock materials:', err);
    }
  }, [hasInventoryAccess, sessionToken]);

  const fetchExpired = useCallback(async () => {
    if (!sessionToken || !hasInventoryAccess) {
      setExpiredMaterials([]);
      return;
    }

    try {
      const result = await inventoryIpc.reporting.getExpiredMaterials();
      setExpiredMaterials(result);
    } catch (err) {
      console.error('Failed to fetch expired materials:', err);
    }
  }, [hasInventoryAccess, sessionToken]);

  // S-1 perf: single IPC call that aggregates materials + stats + lowStock + expired.
  const fetchDashboard = useCallback(async () => {
    if (!sessionToken) {
      setMaterials([]);
      setStats(null);
      setLowStockMaterials([]);
      setExpiredMaterials([]);
      setError(AUTH_ERROR_MESSAGE);
      setLoading(false);
      return;
    }
    if (!hasInventoryAccess) {
      setMaterials([]);
      setError(PERMISSION_ERROR_MESSAGE);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const t0 = performance.now();
      const data = await inventoryIpc.getDashboardData();
      const elapsed = performance.now() - t0;
      if (elapsed > 200) console.warn(`[Perf] fetchDashboard slow: ${elapsed.toFixed(1)}ms`);
      setMaterials(data.materials);
      setStats(data.stats);
      setLowStockMaterials(data.low_stock.items);
      setExpiredMaterials(data.expired);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [hasInventoryAccess, sessionToken]);

  const fetchingRef = useRef(false);
  const initializedRef = useRef(false);

  // Initial load: 1 dashboard call instead of 4 individual calls.
  useEffect(() => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    initializedRef.current = false;

    void fetchDashboard().finally(() => {
      fetchingRef.current = false;
      initializedRef.current = true;
    });
  }, [fetchDashboard]);

  // When query filters change after initial load, only refetch materials.
  useEffect(() => {
    if (!initializedRef.current) return;
    void fetchMaterials();
  }, [fetchMaterials]);

  const createMaterial = useCallback(async (request: CreateMaterialRequest, _userId?: string) => {
    if (!sessionToken) {
      throw new Error(AUTH_ERROR_MESSAGE);
    }
    if (!hasInventoryAccess) {
      throw new Error(PERMISSION_ERROR_MESSAGE);
    }

    const result = await inventoryIpc.material.create(request);
    setMaterials(prev => [...prev, result]);
    void fetchStats();
    return result;
  }, [fetchStats, hasInventoryAccess, sessionToken]);

  const updateMaterial = useCallback(async (id: string, request: CreateMaterialRequest, _userId?: string) => {
    if (!sessionToken) {
      throw new Error(AUTH_ERROR_MESSAGE);
    }
    if (!hasInventoryAccess) {
      throw new Error(PERMISSION_ERROR_MESSAGE);
    }

    const result = await inventoryIpc.material.update(id, request);
    setMaterials(prev => prev.map(m => m.id === id ? result : m));
    void fetchStats();
    return result;
  }, [fetchStats, hasInventoryAccess, sessionToken]);

  const updateStock = useCallback(async (request: UpdateStockRequest) => {
    if (!sessionToken) {
      throw new Error(AUTH_ERROR_MESSAGE);
    }
    if (!hasInventoryAccess) {
      throw new Error(PERMISSION_ERROR_MESSAGE);
    }

    const result = await inventoryIpc.stock.updateStock(request);
    setMaterials(prev => prev.map(m => m.id === request.material_id ? result : m));
    void fetchStats();
    void fetchLowStock();
    return result;
  }, [fetchLowStock, fetchStats, hasInventoryAccess, sessionToken]);

  const recordConsumption = useCallback(async (request: RecordConsumptionRequest) => {
    if (!sessionToken) {
      throw new Error(AUTH_ERROR_MESSAGE);
    }
    if (!hasInventoryAccess) {
      throw new Error(PERMISSION_ERROR_MESSAGE);
    }

    await inventoryIpc.consumption.recordConsumption(request);
    await Promise.allSettled([fetchMaterials(), fetchStats()]);
  }, [fetchMaterials, fetchStats, hasInventoryAccess, sessionToken]);

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
    setMaterials(prev => prev.filter(m => m.id !== id));
    void fetchStats();
  }, [fetchStats, hasInventoryAccess, sessionToken]);

  return {
    materials,
    loading,
    error,
    stats,
    lowStockMaterials,
    expiredMaterials,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    updateStock,
    recordConsumption,
    getMaterial,
    getMaterialBySku,
    getInterventionConsumption,
    getInterventionSummary,
    getMaterialStats,
    refetch: fetchMaterials,
    refetchStats: fetchStats,
    refetchLowStock: fetchLowStock,
    refetchExpired: fetchExpired,
  };
}
