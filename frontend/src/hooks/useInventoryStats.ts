import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface InventoryStats {
  total_materials: number;
  active_materials: number;
  low_stock_materials: number;
  expired_materials: number;
  total_value: number;
  materials_by_category: Record<string, number>;
  recent_transactions: InventoryTransaction[];
  stock_turnover_rate: number;
  average_inventory_age: number;
}

export interface InventoryTransaction {
  id: string;
  material_id: string;
  transaction_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference_number?: string;
  reference_type?: string;
  notes?: string;
  unit_cost?: number;
  total_cost?: number;
  warehouse_id?: string;
  location_from?: string;
  location_to?: string;
  batch_number?: string;
  expiry_date?: string;
  quality_status?: string;
  intervention_id?: string;
  step_id?: string;
  performed_by: string;
  performed_at: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
  last_synced_at?: string;
}

export function useInventoryStats() {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<InventoryStats>('inventory_get_stats');
      setStats(result);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}