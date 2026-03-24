import { safeInvoke, invalidatePattern } from "@/lib/ipc/core";
import { IPC_COMMANDS } from "@/lib/ipc/commands";
import type { JsonObject, JsonValue } from "@/types/json";

const compactJsonObject = (
  value: Record<string, JsonValue | undefined>,
): JsonObject => {
  const entries = Object.entries(value).filter(
    ([, fieldValue]) => fieldValue !== undefined,
  ) as Array<[string, JsonValue]>;
  return Object.fromEntries(entries);
};

export interface MaterialQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: string;
  sort_by?: string;
  sort_order?: string;
}

export interface MaterialCreateRequest {
  name: string;
  description?: string;
  category_id?: string;
  unit?: string;
  unit_price?: number;
  current_stock?: number;
  minimum_stock?: number;
  supplier_id?: string;
  [key: string]: JsonValue | undefined;
}

export interface MaterialUpdateRequest {
  name?: string;
  description?: string;
  category_id?: string;
  unit?: string;
  unit_price?: number;
  minimum_stock?: number;
  supplier_id?: string;
  [key: string]: JsonValue | undefined;
}

export interface StockUpdateRequest {
  material_id: string;
  quantity: number;
  operation: "add" | "subtract" | "set";
  reason?: string;
  [key: string]: JsonValue | undefined;
}

export interface StockAdjustmentRequest {
  material_id: string;
  quantity: number;
  reason: string;
  [key: string]: JsonValue | undefined;
}

export interface ConsumptionRecordRequest {
  material_id: string;
  intervention_id: string;
  quantity: number;
  notes?: string;
  [key: string]: JsonValue | undefined;
}

export interface InventoryTransactionRequest {
  material_id: string;
  transaction_type: string;
  quantity: number;
  reference?: string;
  notes?: string;
  [key: string]: JsonValue | undefined;
}

export interface CategoryCreateRequest {
  name: string;
  description?: string;
  [key: string]: JsonValue | undefined;
}

export interface SupplierCreateRequest {
  name: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  [key: string]: JsonValue | undefined;
}

export interface ConsumptionHistoryQuery {
  page?: number;
  limit?: number;
}

export interface TransactionHistoryQuery {
  page?: number;
  limit?: number;
}

export const materialIpc = {
  /**
   * Lists materials with pagination and filtering
   * @param query - Query parameters for filtering and pagination
   * @returns Promise resolving to paginated material list
   */
  list: (query: MaterialQueryParams = {}) =>
    safeInvoke(IPC_COMMANDS.MATERIAL_LIST, {
      ...query,
    }),

  /**
   * Creates a new material
   * @param data - Material creation data
   * @returns Promise resolving to created material
   */
  create: (data: MaterialCreateRequest) =>
    safeInvoke(IPC_COMMANDS.MATERIAL_CREATE, {
      request: compactJsonObject({ ...data }),
    }),

  /**
   * Updates an existing material
   * @param id - Material ID
   * @param data - Material update data
   * @returns Promise resolving to updated material
   */
  update: (id: string, data: MaterialUpdateRequest) => {
    invalidatePattern("materials:*");
    invalidatePattern("material:*");
    return safeInvoke(IPC_COMMANDS.MATERIAL_UPDATE, {
      id,
      request: compactJsonObject({ ...data }),
    });
  },

  /**
   * Gets a material by ID
   * @param id - Material ID
   * @returns Promise resolving to material details
   */
  get: (id: string) => safeInvoke(IPC_COMMANDS.MATERIAL_GET, { id }),

  /**
   * Deletes a material
   * @param id - Material ID
   * @returns Promise resolving to deletion result
   */
  delete: (id: string) => {
    invalidatePattern("materials:*");
    invalidatePattern("material:*");
    return safeInvoke(IPC_COMMANDS.MATERIAL_DELETE, { id });
  },

  /**
   * Updates material stock levels
   * @param data - Stock update data
   * @returns Promise resolving to updated material with current stock
   */
  updateStock: (data: StockUpdateRequest) => {
    invalidatePattern("materials:*");
    invalidatePattern("material:*");
    return safeInvoke(IPC_COMMANDS.MATERIAL_UPDATE_STOCK, {
      request: compactJsonObject({ ...data }),
    });
  },

  /**
   * Adjusts material stock with correction reason
   * @param data - Stock adjustment data
   * @returns Promise resolving to updated material with current stock
   */
  adjustStock: (data: StockAdjustmentRequest) =>
    safeInvoke(IPC_COMMANDS.MATERIAL_ADJUST_STOCK, {
      request: compactJsonObject({ ...data }),
    }),

  /**
   * Records material consumption for an intervention
   * @param data - Consumption recording data
   * @returns Promise resolving to consumption record
   */
  recordConsumption: (data: ConsumptionRecordRequest) => {
    invalidatePattern("materials:*");
    invalidatePattern("material:*");
    return safeInvoke(IPC_COMMANDS.MATERIAL_RECORD_CONSUMPTION, {
      request: compactJsonObject({ ...data }),
    });
  },

  /**
   * Gets consumption history for a material
   * @param materialId - Material ID
   * @param query - Query parameters for pagination and filtering
   * @returns Promise resolving to consumption history
   */
  getConsumptionHistory: (
    materialId: string,
    query?: ConsumptionHistoryQuery,
  ) =>
    safeInvoke(IPC_COMMANDS.MATERIAL_GET_CONSUMPTION_HISTORY, {
      material_id: materialId,
      page: query?.page || 1,
      limit: query?.limit || 50,
    }),

  /**
   * Creates an inventory transaction
   * @param data - Transaction creation data
   * @returns Promise resolving to created transaction
   */
  createInventoryTransaction: (data: InventoryTransactionRequest) => {
    invalidatePattern("materials:*");
    invalidatePattern("material:*");
    return safeInvoke(IPC_COMMANDS.MATERIAL_CREATE_INVENTORY_TRANSACTION, {
      request: compactJsonObject({ ...data }),
    });
  },

  /**
   * Gets transaction history for a material
   * @param materialId - Material ID
   * @param query - Query parameters for pagination and filtering
   * @returns Promise resolving to transaction history
   */
  getTransactionHistory: (
    materialId: string,
    query?: TransactionHistoryQuery,
  ) =>
    safeInvoke(IPC_COMMANDS.MATERIAL_GET_TRANSACTION_HISTORY, {
      material_id: materialId,
      page: query?.page || 1,
      limit: query?.limit || 50,
    }),

  /**
   * Creates a new material category
   * @param data - Category creation data
   * @returns Promise resolving to created category
   */
  createCategory: (data: CategoryCreateRequest) =>
    safeInvoke(IPC_COMMANDS.MATERIAL_CREATE_CATEGORY, {
      request: compactJsonObject({ ...data }),
    }),

  /**
   * Lists all material categories
   * @returns Promise resolving to category list
   */
  listCategories: () => safeInvoke(IPC_COMMANDS.MATERIAL_LIST_CATEGORIES, {}),

  /**
   * Creates a new supplier
   * @param data - Supplier creation data
   * @returns Promise resolving to created supplier
   */
  createSupplier: (data: SupplierCreateRequest) =>
    safeInvoke(IPC_COMMANDS.MATERIAL_CREATE_SUPPLIER, {
      request: compactJsonObject({ ...data }),
    }),

  /**
   * Lists all suppliers
   * @returns Promise resolving to supplier list
   */
  listSuppliers: () => safeInvoke(IPC_COMMANDS.MATERIAL_LIST_SUPPLIERS, {}),

  /**
   * Gets material statistics
   * @returns Promise resolving to material statistics
   */
  getStats: () => safeInvoke(IPC_COMMANDS.MATERIAL_GET_STATS, {}),

  /**
   * Gets materials with low stock levels
   * @returns Promise resolving to low stock materials
   */
  getLowStockMaterials: () =>
    safeInvoke(IPC_COMMANDS.MATERIAL_GET_LOW_STOCK_MATERIALS, {}),

  /**
   * Gets expired or near-expiry materials
   * @returns Promise resolving to expired materials
   */
  getExpiredMaterials: () =>
    safeInvoke(IPC_COMMANDS.MATERIAL_GET_EXPIRED_MATERIALS, {}),

  /**
   * Gets inventory movement summary for a material
   * @param materialId - Material ID
   * @returns Promise resolving to inventory movement summary
   */
  getInventoryMovementSummary: (materialId: string) =>
    safeInvoke(IPC_COMMANDS.MATERIAL_GET_INVENTORY_MOVEMENT_SUMMARY, {
      material_id: materialId,
    }),
};
