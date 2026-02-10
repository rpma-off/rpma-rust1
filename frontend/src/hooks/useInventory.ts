import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Material, 
  MaterialConsumption, 
  MaterialStats, 
  InventoryStats, 
  InterventionMaterialSummary, 
  MaterialType, 
  UnitOfMeasure 
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
  specifications?: any;
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

export function useInventory(query?: InventoryQuery) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [lowStockMaterials, setLowStockMaterials] = useState<Material[]>([]);
  const [expiredMaterials, setExpiredMaterials] = useState<Material[]>([]);

  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<Material[]>('material_list', {
        materialType: query?.material_type,
        category: query?.category,
        activeOnly: query?.active_only,
        limit: query?.limit,
        offset: query?.offset,
      });
      setMaterials(result);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const fetchStats = useCallback(async () => {
    try {
      const result = await invoke<InventoryStats>('inventory_get_stats');
      setStats(result);
    } catch (err) {
      console.error('Failed to fetch inventory stats:', err);
    }
  }, []);

  const fetchLowStock = useCallback(async () => {
    try {
      const result = await invoke<Material[]>('material_get_low_stock');
      setLowStockMaterials(result);
    } catch (err) {
      console.error('Failed to fetch low stock materials:', err);
    }
  }, []);

  const fetchExpired = useCallback(async () => {
    try {
      const result = await invoke<Material[]>('material_get_expired');
      setExpiredMaterials(result);
    } catch (err) {
      console.error('Failed to fetch expired materials:', err);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
    fetchStats();
    fetchLowStock();
    fetchExpired();
  }, [fetchMaterials, fetchStats, fetchLowStock, fetchExpired]);

  const createMaterial = useCallback(async (request: CreateMaterialRequest, userId: string) => {
    try {
      const result = await invoke<Material>('material_create', {
        request,
        userId,
      });
      await fetchMaterials();
      await fetchStats();
      await fetchLowStock();
      await fetchExpired();
      return result;
    } catch (err) {
      throw new Error(err as string);
    }
  }, [fetchMaterials, fetchStats, fetchLowStock, fetchExpired]);

  const updateMaterial = useCallback(async (id: string, request: CreateMaterialRequest, userId: string) => {
    try {
      const result = await invoke<Material>('material_update', {
        id,
        request,
        userId,
      });
      await fetchMaterials();
      await fetchStats();
      await fetchLowStock();
      await fetchExpired();
      return result;
    } catch (err) {
      throw new Error(err as string);
    }
  }, [fetchMaterials, fetchStats, fetchLowStock, fetchExpired]);

  const updateStock = useCallback(async (request: UpdateStockRequest) => {
    try {
      const result = await invoke<Material>('material_update_stock', { request });
      await fetchMaterials();
      await fetchStats();
      await fetchLowStock();
      await fetchExpired();
      return result;
    } catch (err) {
      throw new Error(err as string);
    }
  }, [fetchMaterials, fetchStats, fetchLowStock, fetchExpired]);

  const recordConsumption = useCallback(async (request: RecordConsumptionRequest) => {
    try {
      const result = await invoke<MaterialConsumption>('material_record_consumption', { request });
      await fetchMaterials();
      await fetchStats();
      return result;
    } catch (err) {
      throw new Error(err as string);
    }
  }, [fetchMaterials, fetchStats]);

  const getMaterial = useCallback(async (id: string): Promise<Material | null> => {
    try {
      const result = await invoke<Material | null>('material_get', { id });
      return result;
    } catch (err) {
      throw new Error(err as string);
    }
  }, []);

  const getMaterialBySku = useCallback(async (sku: string): Promise<Material | null> => {
    try {
      const result = await invoke<Material | null>('material_get_by_sku', { sku });
      return result;
    } catch (err) {
      throw new Error(err as string);
    }
  }, []);

  const getInterventionConsumption = useCallback(async (interventionId: string): Promise<MaterialConsumption[]> => {
    try {
      const result = await invoke<MaterialConsumption[]>('material_get_intervention_consumption', {
        interventionId,
      });
      return result;
    } catch (err) {
      throw new Error(err as string);
    }
  }, []);

  const getInterventionSummary = useCallback(async (interventionId: string): Promise<InterventionMaterialSummary> => {
    try {
      const result = await invoke<InterventionMaterialSummary>('material_get_intervention_summary', {
        interventionId,
      });
      return result;
    } catch (err) {
      throw new Error(err as string);
    }
  }, []);

  const getMaterialStats = useCallback(async (): Promise<MaterialStats> => {
    try {
      const result = await invoke<MaterialStats>('material_get_stats');
      return result;
    } catch (err) {
      throw new Error(err as string);
    }
  }, []);

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