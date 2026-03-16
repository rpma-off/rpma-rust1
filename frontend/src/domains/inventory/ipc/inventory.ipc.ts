import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { JsonObject } from '@/types/json';
import {
  materialOperations,
  stockOperations,
  consumptionOperations,
  reportingOperations,
  supplierOperations,
  categoryOperations,
} from '../server';
import type {
  InventoryStats,
  InterventionMaterialSummary,
  InventoryMovementSummary,
  Material,
  MaterialConsumption,
  MaterialStats,
  LowStockMaterialsResponse,
  InventoryDashboardData,
} from '../api/types';

export const inventoryIpc = {
  material: materialOperations,
  stock: stockOperations,
  consumption: consumptionOperations,
  reporting: reportingOperations,
  supplier: supplierOperations,
  category: categoryOperations,

  getInventoryStats: (): Promise<InventoryStats> =>
    safeInvoke<InventoryStats>(IPC_COMMANDS.INVENTORY_GET_STATS, {}),

  getMaterialBySku: (sku: string): Promise<Material | null> =>
    safeInvoke<Material | null>(IPC_COMMANDS.MATERIAL_GET_BY_SKU, { sku } as JsonObject),

  getInterventionConsumption: (interventionId: string): Promise<MaterialConsumption[]> =>
    safeInvoke<MaterialConsumption[]>(IPC_COMMANDS.MATERIAL_GET_INTERVENTION_CONSUMPTION, {
      interventionId,
    }),

  getInterventionSummary: (interventionId: string): Promise<InterventionMaterialSummary> =>
    safeInvoke<InterventionMaterialSummary>(IPC_COMMANDS.MATERIAL_GET_INTERVENTION_SUMMARY, {
      interventionId,
    }),

  getMaterialStats: (): Promise<MaterialStats> =>
    safeInvoke<MaterialStats>(IPC_COMMANDS.MATERIAL_GET_STATS, {} as JsonObject),

  getLowStockMaterials: (): Promise<LowStockMaterialsResponse> =>
    reportingOperations.getLowStockMaterials(),

  getMovementSummaries: (): Promise<InventoryMovementSummary[]> =>
    safeInvoke<InventoryMovementSummary[]>(IPC_COMMANDS.MATERIAL_GET_INVENTORY_MOVEMENT_SUMMARY, {} as JsonObject),

  /** S-1 perf: replaces 4 IPC calls (materials + stats + lowStock + expired) with 1. */
  getDashboardData: (): Promise<InventoryDashboardData> =>
    safeInvoke<InventoryDashboardData>(IPC_COMMANDS.INVENTORY_GET_DASHBOARD_DATA, {} as JsonObject),
};

