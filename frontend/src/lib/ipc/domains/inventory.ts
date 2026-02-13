import { safeInvoke } from '../core';
import { IPC_COMMANDS } from '../commands';
import type {
  InventoryMovementSummary,
  InventoryTransaction,
  Material,
  MaterialCategory,
  MaterialConsumption,
  MaterialStats,
  MaterialType,
  Supplier,
  UnitOfMeasure
} from '@/lib/inventory';
import type { Pagination } from '@/types/api';
import type { JsonValue } from '@/types/json';

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
  material_id: string;
  quantity: number;
  transaction_type: 'stock_in' | 'stock_out' | 'adjustment' | 'waste';
  notes?: string;
  batch_number?: string;
  expiry_date?: string;
  unit_cost?: number;
  reference_number?: string;
  reference_type?: string;
};

export type AdjustStockRequest = UpdateStockRequest & {
  reason?: string;
};

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

/**
 * Inventory management operations including CRUD and specialized inventory operations
 */

// Material CRUD operations
export const materialOperations = {
  /**
   * Lists materials with pagination and filtering
   * @param sessionToken - User's session token
   * @param query - Query parameters for filtering and pagination
   * @returns Promise resolving to paginated material list
   */
  list: (sessionToken: string, query: Partial<MaterialQuery>): Promise<MaterialListResponse> =>
    safeInvoke<MaterialListResponse>(IPC_COMMANDS.MATERIAL_LIST, {
      sessionToken,
      ...query
    }),

  /**
   * Creates a new material
   * @param data - Material creation data
   * @param sessionToken - User's session token
   * @returns Promise resolving to created material
   */
  create: (data: CreateMaterialRequest, sessionToken: string): Promise<Material> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.MATERIAL_CREATE, {
      request: {
        ...data,
        session_token: sessionToken
      }
    }).then(result => {
      if (result && typeof result === 'object' && 'data' in result) {
        return (result as { data: Material }).data;
      }
      throw new Error('Invalid response format for material create');
    }),

  /**
   * Updates an existing material
   * @param id - Material ID
   * @param data - Material update data
   * @param sessionToken - User's session token
   * @returns Promise resolving to updated material
   */
  update: (id: string, data: UpdateMaterialRequest, sessionToken: string): Promise<Material> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.MATERIAL_UPDATE, {
      id,
      request: {
        ...data,
        session_token: sessionToken
      }
    }).then(result => {
      if (result && typeof result === 'object' && 'data' in result) {
        return (result as { data: Material }).data;
      }
      throw new Error('Invalid response format for material update');
    }),

  /**
   * Gets a material by ID
   * @param id - Material ID
   * @param sessionToken - User's session token
   * @returns Promise resolving to material details
   */
  get: (id: string, sessionToken: string): Promise<Material> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.MATERIAL_GET, {
      sessionToken,
      id
    }).then(result => {
      if (result && typeof result === 'object' && 'data' in result) {
        return (result as { data: Material }).data;
      }
      throw new Error('Invalid response format for material get');
    }),

  /**
   * Deletes a material
   * @param id - Material ID
   * @param sessionToken - User's session token
   * @returns Promise resolving to deletion result
   */
  delete: (id: string, sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.MATERIAL_DELETE, {
      sessionToken,
      id
    }),
};

// Stock management operations
export const stockOperations = {
  /**
   * Updates material stock levels
   * @param data - Stock update data
   * @param sessionToken - User's session token
   * @returns Promise resolving to updated material with current stock
   */
  updateStock: (data: UpdateStockRequest, sessionToken: string): Promise<Material> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.MATERIAL_UPDATE_STOCK, {
      request: {
        ...data,
        session_token: sessionToken
      }
    }).then(result => {
      if (result && typeof result === 'object' && 'data' in result) {
        return (result as { data: Material }).data;
      }
      throw new Error('Invalid response format for update stock');
    }),

  /**
   * Adjusts material stock with correction reason
   * @param data - Stock adjustment data
   * @param sessionToken - User's session token
   * @returns Promise resolving to updated material with current stock
   */
  adjustStock: (data: AdjustStockRequest, sessionToken: string): Promise<Material> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.MATERIAL_ADJUST_STOCK, {
      request: {
        ...data,
        session_token: sessionToken
      }
    }).then(result => {
      if (result && typeof result === 'object' && 'data' in result) {
        return (result as { data: Material }).data;
      }
      throw new Error('Invalid response format for adjust stock');
    }),
};

// Consumption tracking operations
export const consumptionOperations = {
  /**
   * Records material consumption for an intervention
   * @param data - Consumption recording data
   * @param sessionToken - User's session token
   * @returns Promise resolving to consumption record
   */
  recordConsumption: (data: RecordConsumptionRequest, sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.MATERIAL_RECORD_CONSUMPTION, {
      request: {
        ...data,
        session_token: sessionToken
      }
    }),

  /**
   * Gets consumption history for a material
   * @param materialId - Material ID
   * @param sessionToken - User's session token
   * @param query - Query parameters for pagination and filtering
   * @returns Promise resolving to consumption history
   */
  getConsumptionHistory: (
    materialId: string,
    sessionToken: string,
    query?: { page?: number; limit?: number }
  ): Promise<ConsumptionHistory> =>
    safeInvoke<ConsumptionHistory>(IPC_COMMANDS.MATERIAL_GET_CONSUMPTION_HISTORY, {
      sessionToken,
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
   * @param sessionToken - User's session token
   * @returns Promise resolving to created transaction
   */
  createInventoryTransaction: (data: CreateInventoryTransactionRequest, sessionToken: string): Promise<InventoryTransaction> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.MATERIAL_CREATE_INVENTORY_TRANSACTION, {
      request: {
        ...data,
        session_token: sessionToken
      }
    }).then(result => {
      // Validate the response
      if (result && typeof result === 'object' && 'data' in result) {
        return result.data as InventoryTransaction;
      }
      throw new Error('Invalid response format for create inventory transaction');
    }),

  /**
   * Gets transaction history for a material
   * @param materialId - Material ID
   * @param sessionToken - User's session token
   * @param query - Query parameters for pagination and filtering
   * @returns Promise resolving to transaction history
   */
  getTransactionHistory: (
    materialId: string,
    sessionToken: string,
    query?: { page?: number; limit?: number }
  ): Promise<{ transactions: InventoryTransaction[]; pagination: Pagination }> =>
    safeInvoke<{ transactions: InventoryTransaction[]; pagination: Pagination }>(
      IPC_COMMANDS.MATERIAL_GET_TRANSACTION_HISTORY,
      {
        sessionToken,
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
   * @param sessionToken - User's session token
   * @returns Promise resolving to created category
   */
  createCategory: (data: CreateMaterialCategoryRequest, sessionToken: string): Promise<MaterialCategory> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.MATERIAL_CREATE_CATEGORY, {
      request: {
        ...data,
        session_token: sessionToken
      }
    }).then(result => {
      if (result && typeof result === 'object' && 'data' in result) {
        return (result as { data: MaterialCategory }).data;
      }
      throw new Error('Invalid response format for create category');
    }),

  /**
   * Lists all material categories
   * @param sessionToken - User's session token
   * @returns Promise resolving to category list
   */
  listCategories: (sessionToken: string): Promise<MaterialCategory[]> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.MATERIAL_LIST_CATEGORIES, {
      sessionToken
    }).then(result => {
      if (result && typeof result === 'object' && 'data' in result && Array.isArray((result as { data: MaterialCategory[] }).data)) {
        return (result as { data: MaterialCategory[] }).data;
      }
      throw new Error('Invalid response format for list categories');
    }),
};

// Supplier operations
export const supplierOperations = {
  /**
   * Creates a new supplier
   * @param data - Supplier creation data
   * @param sessionToken - User's session token
   * @returns Promise resolving to created supplier
   */
  createSupplier: (data: CreateSupplierRequest, sessionToken: string): Promise<Supplier> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.MATERIAL_CREATE_SUPPLIER, {
      request: {
        ...data,
        session_token: sessionToken
      }
    }).then(result => {
      if (result && typeof result === 'object' && 'data' in result) {
        return (result as { data: Supplier }).data;
      }
      throw new Error('Invalid response format for create supplier');
    }),

  /**
   * Lists all suppliers
   * @param sessionToken - User's session token
   * @returns Promise resolving to supplier list
   */
  listSuppliers: (sessionToken: string): Promise<Supplier[]> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.MATERIAL_LIST_SUPPLIERS, {
      sessionToken
    }).then(result => {
      if (result && typeof result === 'object' && 'data' in result && Array.isArray((result as { data: Supplier[] }).data)) {
        return (result as { data: Supplier[] }).data;
      }
      throw new Error('Invalid response format for list suppliers');
    }),
};

// Reporting and statistics operations
export const reportingOperations = {
  /**
   * Gets material statistics
   * @param sessionToken - User's session token
   * @returns Promise resolving to material statistics
   */
  getStats: (sessionToken: string): Promise<MaterialStats> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.MATERIAL_GET_STATS, {
      sessionToken
    }).then(result => {
      if (result && typeof result === 'object' && 'data' in result) {
        return result.data as MaterialStats;
      }
      throw new Error('Invalid response format for get stats');
    }),

  /**
   * Gets materials with low stock levels
   * @param sessionToken - User's session token
   * @returns Promise resolving to low stock materials
   */
  getLowStockMaterials: (sessionToken: string): Promise<Material[]> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.MATERIAL_GET_LOW_STOCK_MATERIALS, {
      sessionToken
    }).then(result => {
      if (result && typeof result === 'object' && 'data' in result && Array.isArray((result as { data: Material[] }).data)) {
        return (result as { data: Material[] }).data;
      }
      throw new Error('Invalid response format for get low stock materials');
    }),

  /**
   * Gets expired or near-expiry materials
   * @param sessionToken - User's session token
   * @returns Promise resolving to expired materials
   */
  getExpiredMaterials: (sessionToken: string): Promise<Material[]> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.MATERIAL_GET_EXPIRED_MATERIALS, {
      sessionToken
    }).then(result => {
      if (result && typeof result === 'object' && 'data' in result && Array.isArray((result as { data: Material[] }).data)) {
        return (result as { data: Material[] }).data;
      }
      throw new Error('Invalid response format for get expired materials');
    }),

  /**
   * Gets inventory movement summary for a material
   * @param materialId - Material ID
   * @param sessionToken - User's session token
   * @returns Promise resolving to inventory movement summary
   */
  getInventoryMovementSummary: (materialId: string, sessionToken: string): Promise<InventoryMovementSummary> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.MATERIAL_GET_INVENTORY_MOVEMENT_SUMMARY, {
      sessionToken,
      material_id: materialId,
    }).then(result => {
      // Validate the response
      if (result && typeof result === 'object' && 'data' in result) {
        return result.data as InventoryMovementSummary;
      }
      throw new Error('Invalid response format for get inventory movement summary');
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
