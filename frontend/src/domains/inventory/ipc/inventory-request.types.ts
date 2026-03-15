import type { JsonValue } from '@/types/json';
import type { MaterialType, UnitOfMeasure } from '../api/types';

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
  specifications?: JsonValue;
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
  /** ID of the material to update. */
  material_id: string;
  /**
   * Signed quantity change (positive = stock in, negative = stock out).
   * Maps to `quantity_change` on the Rust backend `UpdateStockRequest` DTO.
   */
  quantity_change: number;
  /** Human-readable reason for the stock change (required by backend). */
  reason: string;
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
