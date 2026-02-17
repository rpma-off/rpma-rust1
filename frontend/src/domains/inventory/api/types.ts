// Inventory types that are not auto-generated from Rust
// These are defined manually to avoid TS derivation issues with DateTime

export type MaterialType = "ppf_film" | "adhesive" | "cleaning_solution" | "tool" | "consumable";
export type UnitOfMeasure = "piece" | "meter" | "liter" | "gram" | "roll";
export type InventoryTransactionType = "stock_in" | "stock_out" | "adjustment" | "transfer" | "waste" | "return";

// Simplified Material interface matching the Rust struct
export interface Material {
  // Identifiers
  id: string;
  sku: string;
  name: string;
  description?: string;

  // Material type and category
  material_type: MaterialType;
  category?: string;
  subcategory?: string;
  category_id?: string;

  // Specifications
  brand?: string;
  model?: string;
  specifications?: Record<string, unknown>;

  // Inventory
  unit_of_measure: UnitOfMeasure;
  current_stock: number;
  minimum_stock?: number;
  maximum_stock?: number;
  reorder_point?: number;

  // Pricing
  unit_cost?: number;
  currency: string;

  // Supplier information
  supplier_id?: string;
  supplier_name?: string;
  supplier_sku?: string;

  // Quality and compliance
  quality_grade?: string;
  certification?: string;
  expiry_date?: string;
  batch_number?: string;
  serial_numbers?: string[];

  // Status
  is_active: boolean;
  is_discontinued: boolean;
  is_expired?: boolean;
  is_low_stock?: boolean;

  // Location
  storage_location?: string;
  warehouse_id?: string;

  // Audit
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;

  // Sync
  synced: boolean;
  last_synced_at?: string;
}

// Material consumption record
export interface MaterialConsumption {
  // Identifiers
  id: string;
  intervention_id: string;
  material_id: string;
  step_id?: string;

  // Consumption details
  quantity_used: number;
  unit_cost?: number;
  total_cost?: number;
  waste_quantity: number;
  waste_reason?: string;

  // Quality tracking
  batch_used?: string;
  expiry_used?: string;
  quality_notes?: string;

  // Workflow integration
  step_number?: number;
  recorded_by?: string;
  recorded_at: string;

  // Audit
  created_at: string;
  updated_at: string;

  // Sync
  synced: boolean;
  last_synced_at?: string;
}

// Material statistics
export interface MaterialStats {
  total_materials: number;
  active_materials: number;
  low_stock_materials: number;
  expired_materials: number;
  total_value: number;
  materials_by_type: Record<string, number>;
}

// Inventory statistics
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

// Inventory transaction
export interface InventoryTransaction {
  // Identifiers
  id: string;
  material_id: string;
  transaction_type: InventoryTransactionType;

  // Quantities
  quantity: number;
  previous_stock: number;
  new_stock: number;

  // Transaction details
  reference_number?: string;
  reference_type?: string;
  notes?: string;

  // Cost tracking
  unit_cost?: number;
  total_cost?: number;

  // Location tracking
  warehouse_id?: string;
  location_from?: string;
  location_to?: string;

  // Quality and batch tracking
  batch_number?: string;
  expiry_date?: string;
  quality_status?: string;

  // Workflow integration
  intervention_id?: string;
  step_id?: string;

  // User and audit
  performed_by: string;
  performed_at: string;

  // Audit
  created_at: string;
  updated_at: string;

  // Sync
  synced: boolean;
  last_synced_at?: string;
}

// Supplier information
export interface Supplier {
  // Identifiers
  id: string;
  name: string;
  code?: string;

  // Contact information
  contact_person?: string;
  email?: string;
  phone?: string;
  website?: string;

  // Address
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;

  // Business information
  tax_id?: string;
  business_license?: string;
  payment_terms?: string;
  lead_time_days: number;

  // Status
  is_active: boolean;
  is_preferred: boolean;

  // Quality metrics
  quality_rating?: number;
  delivery_rating?: number;
  on_time_delivery_rate?: number;

  // Notes
  notes?: string;
  special_instructions?: string;

  // Audit
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;

  // Sync
  synced: boolean;
  last_synced_at?: string;
}

// Material category
export interface MaterialCategory {
  // Identifiers
  id: string;
  name: string;
  code?: string;

  // Hierarchy
  parent_id?: string;
  level: number;

  // Description and metadata
  description?: string;
  color?: string;

  // Status
  is_active: boolean;

  // Audit
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;

  // Sync
  synced: boolean;
  last_synced_at?: string;
}

// Intervention material summary
export interface InterventionMaterialSummary {
  intervention_id: string;
  total_materials_used: number;
  total_cost: number;
  materials: MaterialConsumptionSummary[];
}

// Material consumption summary
export interface MaterialConsumptionSummary {
  material_id: string;
  material_name: string;
  material_type: string;
  quantity_used: number;
  unit_cost?: number;
  total_cost?: number;
  waste_quantity: number;
}

// Inventory movement summary
export interface InventoryMovementSummary {
  material_id: string;
  material_name: string;
  total_stock_in: number;
  total_stock_out: number;
  net_movement: number;
  current_stock: number;
  last_transaction_date?: string;
}

