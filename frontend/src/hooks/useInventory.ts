import { useState, useEffect, useCallback, useRef } from 'react';
import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import { useAuth } from '@/lib/auth/compatibility';
import type { JsonObject } from '@/types/json';
import {
  Material,
  MaterialConsumption,
  MaterialStats,
  InventoryStats,
  InterventionMaterialSummary,
  MaterialType,
  UnitOfMeasure,
} from '@/lib/inventory';

export interface CreateMaterialRequest {
  sku: string;
  name: string;
  description?: string;
  material_type: MaterialType;
  category?: string;
  subcategory?: string;
  category_id?: string;
  brand?: string;
  model?: string;
  specifications?: Record<string, unknown>;
  unit_of_measure: UnitOfMeasure;
  current_stock?: number;
  minimum_stock?: number;
  maximum_stock?: number;
  reorder_point?: number;
  unit_cost?: number;
  currency?: string;
  supplier_id?: string;
  supplier_name?: string;
  supplier_sku?: string;
  quality_grade?: string;
  certification?: string;
  expiry_date?: string;
  batch_number?: string;
  serial_numbers?: string[];
  storage_location?: string;
  warehouse_id?: string;
}

export interface UpdateStockRequest {
  material_id: string;
  quantity: number;
  transaction_type: 'stock_in' | 'stock_out' | 'adjustment' | 'waste';
  notes?: string;
  batch_number?: string;
  expiry_date?: string;
  unit_cost?: number;
  reference_number?: string;
  reference_type?: string;
}

export interface RecordConsumptionRequest {
  intervention_id: string;
  material_id: string;
  quantity_used: number;
  step_id?: string;
  unit_cost?: number;
  waste_quantity?: number;
  waste_reason?: string;
  batch_used?: string;
  expiry_used?: string;
  quality_notes?: string;
  step_number?: number;
}

export interface InventoryQuery {
  material_type?: MaterialType | null;
  category?: string | null;
  active_only?: boolean;
  limit?: number;
  offset?: number;
}

const AUTH_ERROR_MESSAGE = 'Authentication required';

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function useInventory(query?: InventoryQuery) {
  const { user } = useAuth();
  const sessionToken = user?.token;
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [lowStockMaterials, setLowStockMaterials] = useState<Material[]>([]);
  const [expiredMaterials, setExpiredMaterials] = useState<Material[]>([]);

  const asJsonObject = (value: Record<string, unknown>): JsonObject => value as JsonObject;

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
        materialType: query?.material_type ?? undefined,
        category: query?.category ?? undefined,
        activeOnly: query?.active_only,
        limit: query?.limit,
        offset: query?.offset,
      } as JsonObject);
      setMaterials(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [query?.active_only, query?.category, query?.limit, query?.material_type, query?.offset, sessionToken]);

  const fetchStats = useCallback(async () => {
    if (!sessionToken) {
      setStats(null);
      return;
    }

    try {
      const result = await safeInvoke<InventoryStats>(IPC_COMMANDS.INVENTORY_GET_STATS, { sessionToken } as JsonObject);
      setStats(result);
    } catch (err) {
      console.error('Failed to fetch inventory stats:', err);
    }
  }, [sessionToken]);

  const fetchLowStock = useCallback(async () => {
    if (!sessionToken) {
      setLowStockMaterials([]);
      return;
    }

    try {
      const result = await safeInvoke<Material[]>(IPC_COMMANDS.MATERIAL_GET_LOW_STOCK_MATERIALS, { sessionToken } as JsonObject);
      setLowStockMaterials(result);
    } catch (err) {
      console.error('Failed to fetch low stock materials:', err);
    }
  }, [sessionToken]);

  const fetchExpired = useCallback(async () => {
    if (!sessionToken) {
      setExpiredMaterials([]);
      return;
    }

    try {
      const result = await safeInvoke<Material[]>(IPC_COMMANDS.MATERIAL_GET_EXPIRED_MATERIALS, { sessionToken } as JsonObject);
      setExpiredMaterials(result);
    } catch (err) {
      console.error('Failed to fetch expired materials:', err);
    }
  }, [sessionToken]);

  // Root cause fix: prevent StrictMode double-invoke from firing duplicate
  // parallel fetches. A single ref guards all four initial requests.
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    Promise.all([
      fetchMaterials(),
      fetchStats(),
      fetchLowStock(),
      fetchExpired(),
    ]).finally(() => {
      fetchingRef.current = false;
    });
  }, [fetchExpired, fetchLowStock, fetchMaterials, fetchStats]);

  const createMaterial = useCallback(async (request: CreateMaterialRequest, _userId?: string) => {
    if (!sessionToken) {
      throw new Error(AUTH_ERROR_MESSAGE);
    }

    const result = await safeInvoke<Material>(IPC_COMMANDS.MATERIAL_CREATE, asJsonObject({
      sessionToken,
      request,
    }));
    await Promise.all([fetchMaterials(), fetchStats(), fetchLowStock(), fetchExpired()]);
    return result;
  }, [fetchExpired, fetchLowStock, fetchMaterials, fetchStats, sessionToken]);

  const updateMaterial = useCallback(async (id: string, request: CreateMaterialRequest, _userId?: string) => {
    if (!sessionToken) {
      throw new Error(AUTH_ERROR_MESSAGE);
    }

    const result = await safeInvoke<Material>(IPC_COMMANDS.MATERIAL_UPDATE, asJsonObject({
      sessionToken,
      id,
      request,
    }));
    await Promise.all([fetchMaterials(), fetchStats(), fetchLowStock(), fetchExpired()]);
    return result;
  }, [fetchExpired, fetchLowStock, fetchMaterials, fetchStats, sessionToken]);

  const updateStock = useCallback(async (request: UpdateStockRequest) => {
    if (!sessionToken) {
      throw new Error(AUTH_ERROR_MESSAGE);
    }

    const result = await safeInvoke<Material>(IPC_COMMANDS.MATERIAL_UPDATE_STOCK, asJsonObject({
      sessionToken,
      request,
    }));
    await Promise.all([fetchMaterials(), fetchStats(), fetchLowStock(), fetchExpired()]);
    return result;
  }, [fetchExpired, fetchLowStock, fetchMaterials, fetchStats, sessionToken]);

  const recordConsumption = useCallback(async (request: RecordConsumptionRequest) => {
    if (!sessionToken) {
      throw new Error(AUTH_ERROR_MESSAGE);
    }

    const result = await safeInvoke<MaterialConsumption>(IPC_COMMANDS.MATERIAL_RECORD_CONSUMPTION, asJsonObject({
      sessionToken,
      request,
    }));
    await Promise.all([fetchMaterials(), fetchStats()]);
    return result;
  }, [fetchMaterials, fetchStats, sessionToken]);

  const getMaterial = useCallback(async (id: string): Promise<Material | null> => {
    if (!sessionToken) {
      throw new Error(AUTH_ERROR_MESSAGE);
    }

    return safeInvoke<Material | null>(IPC_COMMANDS.MATERIAL_GET, { sessionToken, id } as JsonObject);
  }, [sessionToken]);

  const getMaterialBySku = useCallback(async (sku: string): Promise<Material | null> => {
    if (!sessionToken) {
      throw new Error(AUTH_ERROR_MESSAGE);
    }

    return safeInvoke<Material | null>('material_get_by_sku', { sessionToken, sku } as JsonObject);
  }, [sessionToken]);

  const getInterventionConsumption = useCallback(async (interventionId: string): Promise<MaterialConsumption[]> => {
    if (!sessionToken) {
      throw new Error(AUTH_ERROR_MESSAGE);
    }

    return safeInvoke<MaterialConsumption[]>('material_get_intervention_consumption', {
      sessionToken,
      interventionId,
    } as JsonObject);
  }, [sessionToken]);

  const getInterventionSummary = useCallback(async (interventionId: string): Promise<InterventionMaterialSummary> => {
    if (!sessionToken) {
      throw new Error(AUTH_ERROR_MESSAGE);
    }

    return safeInvoke<InterventionMaterialSummary>('material_get_intervention_summary', {
      sessionToken,
      interventionId,
    } as JsonObject);
  }, [sessionToken]);

  const getMaterialStats = useCallback(async (): Promise<MaterialStats> => {
    if (!sessionToken) {
      throw new Error(AUTH_ERROR_MESSAGE);
    }

    return safeInvoke<MaterialStats>(IPC_COMMANDS.MATERIAL_GET_STATS, { sessionToken } as JsonObject);
  }, [sessionToken]);

  return {
    materials,
    loading,
    error,
    stats,
    lowStockMaterials,
    expiredMaterials,
    createMaterial,
    updateMaterial,
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
