import { safeInvoke } from '../core';
import { IPC_COMMANDS } from '../commands';
import { validateMaterial, validateMaterialCategory, validateSupplier, validateMaterialWithStats } from '@/lib/validation/backend-type-guards';
import type {
  Material,
  CreateMaterialRequest,
  UpdateMaterialRequest,
  MaterialListResponse,
  MaterialCategory,
  CreateMaterialCategoryRequest,
  Supplier,
  CreateSupplierRequest,
  UpdateStockRequest,
  AdjustStockRequest,
  RecordConsumptionRequest,
  ConsumptionHistory,
  InventoryTransaction,
  CreateInventoryTransactionRequest,
  MaterialStatistics,
  InventoryMovementSummary,
  MaterialQuery
} from '../types/index';

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
    safeInvoke<unknown>(IPC_COMMANDS.MATERIAL_CREATE, {
      request: {
        ...data,
        session_token: sessionToken
      }
    }).then(result => {
      // Validate the response
      if (result && typeof result === 'object' && 'data' in result) {
        return validateMaterial((result as { data: Material }).data);
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
    safeInvoke<unknown>(IPC_COMMANDS.MATERIAL_UPDATE, {
      id,
      request: {
        ...data,
        session_token: sessionToken
      }
    }).then(result => {
      // Validate the response
      if (result && typeof result === 'object' && 'data' in result) {
        return validateMaterial((result as { data: Material }).data);
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
    safeInvoke<unknown>(IPC_COMMANDS.MATERIAL_GET, {
      sessionToken,
      id
    }).then(result => {
      // Validate the response
      if (result && typeof result === 'object' && 'data' in result) {
        return validateMaterial((result as { data: Material }).data);
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
    safeInvoke<unknown>(IPC_COMMANDS.MATERIAL_UPDATE_STOCK, {
      request: {
        ...data,
        session_token: sessionToken
      }
    }).then(result => {
      // Validate the response
      if (result && typeof result === 'object' && 'data' in result) {
        return validateMaterial((result as { data: Material }).data);
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
    safeInvoke<unknown>(IPC_COMMANDS.MATERIAL_ADJUST_STOCK, {
      request: {
        ...data,
        session_token: sessionToken
      }
    }).then(result => {
      // Validate the response
      if (result && typeof result === 'object' && 'data' in result) {
        return validateMaterial((result as { data: Material }).data);
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
    safeInvoke<unknown>(IPC_COMMANDS.MATERIAL_CREATE_INVENTORY_TRANSACTION, {
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
  ): Promise<{ transactions: InventoryTransaction[]; pagination: any }> =>
    safeInvoke<{ transactions: InventoryTransaction[]; pagination: any }>(
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
    safeInvoke<unknown>(IPC_COMMANDS.MATERIAL_CREATE_CATEGORY, {
      request: {
        ...data,
        session_token: sessionToken
      }
    }).then(result => {
      // Validate the response
      if (result && typeof result === 'object' && 'data' in result) {
        return validateMaterialCategory((result as { data: MaterialCategory }).data);
      }
      throw new Error('Invalid response format for create category');
    }),

  /**
   * Lists all material categories
   * @param sessionToken - User's session token
   * @returns Promise resolving to category list
   */
  listCategories: (sessionToken: string): Promise<MaterialCategory[]> =>
    safeInvoke<unknown>(IPC_COMMANDS.MATERIAL_LIST_CATEGORIES, {
      sessionToken
    }).then(result => {
      // Validate the response
      if (result && typeof result === 'object' && 'data' in result && Array.isArray((result as { data: MaterialCategory[] }).data)) {
        return (result as { data: MaterialCategory[] }).data.map(validateMaterialCategory);
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
    safeInvoke<unknown>(IPC_COMMANDS.MATERIAL_CREATE_SUPPLIER, {
      request: {
        ...data,
        session_token: sessionToken
      }
    }).then(result => {
      // Validate the response
      if (result && typeof result === 'object' && 'data' in result) {
        return validateSupplier((result as { data: Supplier }).data);
      }
      throw new Error('Invalid response format for create supplier');
    }),

  /**
   * Lists all suppliers
   * @param sessionToken - User's session token
   * @returns Promise resolving to supplier list
   */
  listSuppliers: (sessionToken: string): Promise<Supplier[]> =>
    safeInvoke<unknown>(IPC_COMMANDS.MATERIAL_LIST_SUPPLIERS, {
      sessionToken
    }).then(result => {
      // Validate the response
      if (result && typeof result === 'object' && 'data' in result && Array.isArray((result as { data: Supplier[] }).data)) {
        return (result as { data: Supplier[] }).data.map(validateSupplier);
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
  getStats: (sessionToken: string): Promise<MaterialStatistics> =>
    safeInvoke<unknown>(IPC_COMMANDS.MATERIAL_GET_STATS, {
      sessionToken
    }).then(result => {
      // Validate the response
      if (result && typeof result === 'object' && 'data' in result) {
        return result.data as MaterialStatistics;
      }
      throw new Error('Invalid response format for get stats');
    }),

  /**
   * Gets materials with low stock levels
   * @param sessionToken - User's session token
   * @returns Promise resolving to low stock materials
   */
  getLowStockMaterials: (sessionToken: string): Promise<Material[]> =>
    safeInvoke<unknown>(IPC_COMMANDS.MATERIAL_GET_LOW_STOCK_MATERIALS, {
      sessionToken
    }).then(result => {
      // Validate the response
      if (result && typeof result === 'object' && 'data' in result && Array.isArray((result as { data: Material[] }).data)) {
        return (result as { data: Material[] }).data.map(validateMaterial);
      }
      throw new Error('Invalid response format for get low stock materials');
    }),

  /**
   * Gets expired or near-expiry materials
   * @param sessionToken - User's session token
   * @returns Promise resolving to expired materials
   */
  getExpiredMaterials: (sessionToken: string): Promise<Material[]> =>
    safeInvoke<unknown>(IPC_COMMANDS.MATERIAL_GET_EXPIRED_MATERIALS, {
      sessionToken
    }).then(result => {
      // Validate the response
      if (result && typeof result === 'object' && 'data' in result && Array.isArray((result as { data: Material[] }).data)) {
        return (result as { data: Material[] }).data.map(validateMaterial);
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
    safeInvoke<unknown>(IPC_COMMANDS.MATERIAL_GET_INVENTORY_MOVEMENT_SUMMARY, {
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