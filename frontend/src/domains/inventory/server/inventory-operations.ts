import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type {
  InventoryMovementSummary,
  InventoryTransaction,
  LowStockMaterialsResponse,
  Material,
  MaterialCategory,
  MaterialConsumption,
  MaterialStats,
  MaterialType,
  Supplier,
  UnitOfMeasure
} from '@/shared/types';
import type { Pagination } from '@/types/api';
import type { JsonValue } from '@/types/json';
import { unwrapApiResponse, validateLowStockPayload, validateMaterialListPayload } from './response-utils';
// safeInvoke auto-injects session_token for all protected commands (ADR-005).

type PaginationInfo = {
  page: number;
  limit: number;
  total: number | bigint;
  total_pages: number;
};

type MaterialListResponse = {
  data: Material[];
  pagination: PaginationInfo;
  statistics?: MaterialStats | null;
};

export type CreateMaterialRequest = {
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
};

export type UpdateMaterialRequest = Partial<CreateMaterialRequest>;

export type UpdateStockRequest = {
  /** ID of the material whose stock to update. */
  material_id: string;
  /**
   * Signed delta — positive adds stock, negative removes stock.
   * Maps to `quantity_change` on the Rust backend `UpdateStockRequest`.
   */
  quantity_change: number;
  /** Human-readable reason required by the backend (e.g. "Restock from supplier"). */
  reason: string;
};

/** Extended stock-adjustment request (kept for backwards-compat with adjustStock callers). */
export type AdjustStockRequest = UpdateStockRequest;

export type RecordConsumptionRequest = {
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
};

type ConsumptionHistory = {
  records: MaterialConsumption[];
  pagination: PaginationInfo;
};

export type CreateInventoryTransactionRequest = {
  material_id: string;
  transaction_type: string;
  quantity: number;
  notes?: string;
  reference_number?: string;
  reference_type?: string;
  unit_cost?: number;
  warehouse_id?: string;
};

export type CreateMaterialCategoryRequest = {
  name: string;
  code?: string;
  parent_id?: string;
  level?: number;
  description?: string;
  color?: string;
  is_active?: boolean;
};

export type CreateSupplierRequest = {
  name: string;
  code?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  website?: string;
  lead_time_days?: number;
  is_active?: boolean;
  is_preferred?: boolean;
  notes?: string;
  special_instructions?: string;
};

type MaterialQuery = {
  material_type?: MaterialType | null;
  category?: string | null;
  active_only?: boolean;
  limit?: number;
  offset?: number;
  page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
};

// Material CRUD operations
export const materialOperations = {
  /**
   * Lists materials with pagination and filtering
   * @param query - Query parameters for filtering and pagination
   * @returns Promise resolving to paginated material list
   */
  list: (query: Partial<MaterialQuery>): Promise<MaterialListResponse> =>
    safeInvoke<MaterialListResponse>(IPC_COMMANDS.MATERIAL_LIST, {
      ...query
    }),

  /**
   * Creates a new material
   * @param data - Material creation data
   * @returns Promise resolving to created material
   */
  create: (data: CreateMaterialRequest): Promise<Material> =>
    safeInvoke<Material>(IPC_COMMANDS.MATERIAL_CREATE, {
      request: { ...data }
    }),

  /**
   * Updates an existing material
   * @param id - Material ID
   * @param data - Material update data
   * @returns Promise resolving to updated material
   */
  update: (id: string, data: UpdateMaterialRequest): Promise<Material> =>
    safeInvoke<Material>(IPC_COMMANDS.MATERIAL_UPDATE, {
      id,
      request: { ...data }
    }),

  /**
   * Gets a material by ID
   * @param id - Material ID
   * @returns Promise resolving to material details
   */
  get: (id: string): Promise<Material> =>
    safeInvoke<Material>(IPC_COMMANDS.MATERIAL_GET, {
      id
    }),

  /**
   * Deletes a material
   * @param id - Material ID
   * @returns Promise resolving to deletion result
   */
  delete: (id: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.MATERIAL_DELETE, {
      id
    }),
};

// Stock management operations
export const stockOperations = {
  /**
   * Updates material stock levels
   * @param data - Stock update data
   * @returns Promise resolving to updated material with current stock
   */
  updateStock: (data: UpdateStockRequest): Promise<Material> =>
    safeInvoke<Material>(IPC_COMMANDS.MATERIAL_UPDATE_STOCK, {
      request: { ...data }
    }),

  /**
   * Adjusts material stock with correction reason
   * @param data - Stock adjustment data
   * @returns Promise resolving to updated material with current stock
   */
  adjustStock: (data: AdjustStockRequest): Promise<Material> =>
    safeInvoke<Material>(IPC_COMMANDS.MATERIAL_ADJUST_STOCK, {
      request: { ...data }
    }),
};

// Consumption tracking operations
export const consumptionOperations = {
  /**
   * Records material consumption for an intervention
   * @param data - Consumption recording data
   * @returns Promise resolving to consumption record
   */
  recordConsumption: (data: RecordConsumptionRequest): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.MATERIAL_RECORD_CONSUMPTION, {
      request: { ...data }
    }),

  /**
   * Gets consumption history for a material
   * @param materialId - Material ID
   * @param query - Query parameters for pagination and filtering
   * @returns Promise resolving to consumption history
   */
  getConsumptionHistory: (
    materialId: string,
    query?: { page?: number; limit?: number }
  ): Promise<ConsumptionHistory> =>
    safeInvoke<ConsumptionHistory>(IPC_COMMANDS.MATERIAL_GET_CONSUMPTION_HISTORY, {
      material_id: materialId,
      page: query?.page || 1,
      limit: query?.limit || 50,
    }),
};

// Inventory transaction operations
export const transactionOperations = {
  /**
   * Creates an inventory transaction
   * @param data - Transaction creation data
   * @returns Promise resolving to created transaction
   */
  createInventoryTransaction: (data: CreateInventoryTransactionRequest): Promise<InventoryTransaction> =>
    safeInvoke<InventoryTransaction>(IPC_COMMANDS.MATERIAL_CREATE_INVENTORY_TRANSACTION, {
      request: { ...data }
    }),

  /**
   * Gets transaction history for a material
   * @param materialId - Material ID
   * @param query - Query parameters for pagination and filtering
   * @returns Promise resolving to transaction history
   */
  getTransactionHistory: (
    materialId: string,
    query?: { page?: number; limit?: number }
  ): Promise<{ transactions: InventoryTransaction[]; pagination: Pagination }> =>
    safeInvoke<{ transactions: InventoryTransaction[]; pagination: Pagination }>(
      IPC_COMMANDS.MATERIAL_GET_TRANSACTION_HISTORY,
      {
        material_id: materialId,
        page: query?.page || 1,
        limit: query?.limit || 50,
      }
    ),
};

// Category operations
export const categoryOperations = {
  /**
   * Creates a new material category
   * @param data - Category creation data
   * @returns Promise resolving to created category
   */
  createCategory: (data: CreateMaterialCategoryRequest): Promise<MaterialCategory> =>
    safeInvoke<MaterialCategory>(IPC_COMMANDS.MATERIAL_CREATE_CATEGORY, {
      request: { ...data }
    }),

  /**
   * Lists all material categories
   * @returns Promise resolving to category list
   */
  listCategories: (): Promise<MaterialCategory[]> =>
    safeInvoke<MaterialCategory[]>(IPC_COMMANDS.MATERIAL_LIST_CATEGORIES, {}),
};

// Supplier operations
export const supplierOperations = {
  /**
   * Creates a new supplier
   * @param data - Supplier creation data
   * @returns Promise resolving to created supplier
   */
  createSupplier: (data: CreateSupplierRequest): Promise<Supplier> =>
    safeInvoke<Supplier>(IPC_COMMANDS.MATERIAL_CREATE_SUPPLIER, {
      request: { ...data }
    }),

  /**
   * Lists all suppliers
   * @returns Promise resolving to supplier list
   */
  listSuppliers: (): Promise<Supplier[]> =>
    safeInvoke<Supplier[]>(IPC_COMMANDS.MATERIAL_LIST_SUPPLIERS, {}),
};

// Reporting and statistics operations
export const reportingOperations = {
  /**
   * Gets material statistics
   * @returns Promise resolving to material statistics
   */
  getStats: (): Promise<MaterialStats> =>
    safeInvoke<MaterialStats>(IPC_COMMANDS.MATERIAL_GET_STATS, {}),

  /**
   * Gets materials with low stock levels
   * @returns Promise resolving to low stock materials
   */
  getLowStockMaterials: (): Promise<LowStockMaterialsResponse> =>
    safeInvoke<unknown>(IPC_COMMANDS.MATERIAL_GET_LOW_STOCK_MATERIALS, {}).then(async result => {
      const payload = await unwrapApiResponse<unknown>(result, 'get low stock materials');
      return validateLowStockPayload(payload, 'get low stock materials');
    }),

  /**
   * Gets expired or near-expiry materials
   * @returns Promise resolving to expired materials
   */
  getExpiredMaterials: (): Promise<Material[]> =>
    safeInvoke<unknown>(IPC_COMMANDS.MATERIAL_GET_EXPIRED_MATERIALS, {}).then(async result => {
      const payload = await unwrapApiResponse<unknown>(result, 'get expired materials');
      return validateMaterialListPayload(payload, 'get expired materials');
    }),

  /**
   * Gets inventory movement summary for a material
   * @param materialId - Material ID
   * @returns Promise resolving to inventory movement summary
   */
  getInventoryMovementSummary: (materialId: string): Promise<InventoryMovementSummary> =>
    safeInvoke<InventoryMovementSummary>(IPC_COMMANDS.MATERIAL_GET_INVENTORY_MOVEMENT_SUMMARY, {
      material_id: materialId,
    }),
};

/**
 * Combined inventory operations
 */
export const inventoryOperations = {
  material: materialOperations,
  stock: stockOperations,
  consumption: consumptionOperations,
  transaction: transactionOperations,
  category: categoryOperations,
  supplier: supplierOperations,
  reporting: reportingOperations,
};
