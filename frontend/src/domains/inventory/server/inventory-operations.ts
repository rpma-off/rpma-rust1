import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type {
  CreateInventoryTransactionRequest as BackendCreateInventoryTransactionRequest,
  CreateMaterialCategoryRequest as BackendCreateMaterialCategoryRequest,
  CreateMaterialRequest as BackendCreateMaterialRequest,
  CreateSupplierRequest as BackendCreateSupplierRequest,
  RecordConsumptionRequest as BackendRecordConsumptionRequest,
  UpdateStockRequest as BackendUpdateStockRequest,
} from '@/lib/backend.ts';
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
} from '@/shared/types';
import type { Pagination } from '@/types/api';
import {
  unwrapApiResponse,
  validateLowStockPayload,
  validateMaterialListPayload,
} from './response-utils';

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

export type CreateMaterialRequest = Omit<
  BackendCreateMaterialRequest,
  'expiry_date' | 'is_discontinued'
> & {
  expiry_date?: string | number | null;
  is_discontinued?: boolean | null;
};

export type UpdateMaterialRequest = Partial<CreateMaterialRequest>;

export type UpdateStockRequest = Omit<BackendUpdateStockRequest, 'recorded_by'>;

// Extended stock-adjustment request kept for backwards compatibility.
export type AdjustStockRequest = UpdateStockRequest;

export type RecordConsumptionRequest = Omit<
  BackendRecordConsumptionRequest,
  'recorded_by'
>;

type ConsumptionHistory = {
  records: MaterialConsumption[];
  pagination: PaginationInfo;
};

export type CreateInventoryTransactionRequest = Omit<
  BackendCreateInventoryTransactionRequest,
  'expiry_date'
> & {
  expiry_date?: string | number | null;
};

export type CreateMaterialCategoryRequest = Pick<
  BackendCreateMaterialCategoryRequest,
  'name'
> &
  Partial<Omit<BackendCreateMaterialCategoryRequest, 'name'>>;

export type CreateSupplierRequest = Pick<BackendCreateSupplierRequest, 'name'> &
  Partial<Omit<BackendCreateSupplierRequest, 'name'>>;

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

const normalizeTimestamp = (
  value: string | number | null | undefined,
): number | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const toBackendCreateMaterialRequest = (
  request: CreateMaterialRequest,
): BackendCreateMaterialRequest =>
  ({
    ...request,
    expiry_date: normalizeTimestamp(request.expiry_date) ?? null,
    is_discontinued: request.is_discontinued ?? null,
  }) as BackendCreateMaterialRequest;

const toBackendUpdateMaterialRequest = (
  request: UpdateMaterialRequest,
): Partial<BackendCreateMaterialRequest> =>
  ({
    ...request,
    expiry_date:
      request.expiry_date === undefined
        ? undefined
        : normalizeTimestamp(request.expiry_date) ?? null,
  }) as Partial<BackendCreateMaterialRequest>;

const toBackendCreateInventoryTransactionRequest = (
  request: CreateInventoryTransactionRequest,
): BackendCreateInventoryTransactionRequest =>
  ({
    ...request,
    expiry_date: normalizeTimestamp(request.expiry_date) ?? null,
  }) as BackendCreateInventoryTransactionRequest;

// Material CRUD operations
export const materialOperations = {
  list: (query: Partial<MaterialQuery>): Promise<MaterialListResponse> =>
    safeInvoke<MaterialListResponse>(IPC_COMMANDS.MATERIAL_LIST, {
      ...query,
    }),

  create: (data: CreateMaterialRequest): Promise<Material> =>
    safeInvoke<Material>(IPC_COMMANDS.MATERIAL_CREATE, {
      request: toBackendCreateMaterialRequest(data),
    }),

  update: (id: string, data: UpdateMaterialRequest): Promise<Material> =>
    safeInvoke<Material>(IPC_COMMANDS.MATERIAL_UPDATE, {
      id,
      request: toBackendUpdateMaterialRequest(data),
    }),

  get: (id: string): Promise<Material> =>
    safeInvoke<Material>(IPC_COMMANDS.MATERIAL_GET, {
      id,
    }),

  delete: (id: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.MATERIAL_DELETE, {
      id,
    }),
};

export const stockOperations = {
  updateStock: (data: UpdateStockRequest): Promise<Material> =>
    safeInvoke<Material>(IPC_COMMANDS.MATERIAL_UPDATE_STOCK, {
      request: data,
    }),

  adjustStock: (data: AdjustStockRequest): Promise<Material> =>
    safeInvoke<Material>(IPC_COMMANDS.MATERIAL_ADJUST_STOCK, {
      request: data,
    }),
};

export const consumptionOperations = {
  recordConsumption: (data: RecordConsumptionRequest): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.MATERIAL_RECORD_CONSUMPTION, {
      request: data,
    }),

  getConsumptionHistory: (
    materialId: string,
    query?: { page?: number; limit?: number },
  ): Promise<ConsumptionHistory> =>
    safeInvoke<ConsumptionHistory>(IPC_COMMANDS.MATERIAL_GET_CONSUMPTION_HISTORY, {
      material_id: materialId,
      page: query?.page || 1,
      limit: query?.limit || 50,
    }),
};

export const transactionOperations = {
  createInventoryTransaction: (
    data: CreateInventoryTransactionRequest,
  ): Promise<InventoryTransaction> =>
    safeInvoke<InventoryTransaction>(IPC_COMMANDS.MATERIAL_CREATE_INVENTORY_TRANSACTION, {
      request: toBackendCreateInventoryTransactionRequest(data),
    }),

  getTransactionHistory: (
    materialId: string,
    query?: { page?: number; limit?: number },
  ): Promise<{ transactions: InventoryTransaction[]; pagination: Pagination }> =>
    safeInvoke<{ transactions: InventoryTransaction[]; pagination: Pagination }>(
      IPC_COMMANDS.MATERIAL_GET_TRANSACTION_HISTORY,
      {
        material_id: materialId,
        page: query?.page || 1,
        limit: query?.limit || 50,
      },
    ),
};

export const categoryOperations = {
  createCategory: (data: CreateMaterialCategoryRequest): Promise<MaterialCategory> =>
    safeInvoke<MaterialCategory>(IPC_COMMANDS.MATERIAL_CREATE_CATEGORY, {
      request: data,
    }),

  listCategories: (): Promise<MaterialCategory[]> =>
    safeInvoke<MaterialCategory[]>(IPC_COMMANDS.MATERIAL_LIST_CATEGORIES, {}),
};

export const supplierOperations = {
  createSupplier: (data: CreateSupplierRequest): Promise<Supplier> =>
    safeInvoke<Supplier>(IPC_COMMANDS.MATERIAL_CREATE_SUPPLIER, {
      request: data,
    }),

  listSuppliers: (): Promise<Supplier[]> =>
    safeInvoke<Supplier[]>(IPC_COMMANDS.MATERIAL_LIST_SUPPLIERS, {}),
};

export const reportingOperations = {
  getStats: (): Promise<MaterialStats> =>
    safeInvoke<MaterialStats>(IPC_COMMANDS.MATERIAL_GET_STATS, {}),

  getLowStockMaterials: (): Promise<LowStockMaterialsResponse> =>
    safeInvoke<unknown>(IPC_COMMANDS.MATERIAL_GET_LOW_STOCK_MATERIALS, {}).then(
      async (result) => {
        const payload = await unwrapApiResponse<unknown>(
          result,
          'get low stock materials',
        );
        return validateLowStockPayload(payload, 'get low stock materials');
      },
    ),

  getExpiredMaterials: (): Promise<Material[]> =>
    safeInvoke<unknown>(IPC_COMMANDS.MATERIAL_GET_EXPIRED_MATERIALS, {}).then(
      async (result) => {
        const payload = await unwrapApiResponse<unknown>(
          result,
          'get expired materials',
        );
        return validateMaterialListPayload(payload, 'get expired materials');
      },
    ),

  getInventoryMovementSummary: (
    materialId: string,
  ): Promise<InventoryMovementSummary> =>
    safeInvoke<InventoryMovementSummary>(
      IPC_COMMANDS.MATERIAL_GET_INVENTORY_MOVEMENT_SUMMARY,
      {
        material_id: materialId,
      },
    ),
};

export const inventoryOperations = {
  material: materialOperations,
  stock: stockOperations,
  consumption: consumptionOperations,
  transaction: transactionOperations,
  category: categoryOperations,
  supplier: supplierOperations,
  reporting: reportingOperations,
};
