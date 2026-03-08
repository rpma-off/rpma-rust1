import {
  materialOperations,
  stockOperations,
  consumptionOperations,
  reportingOperations,
  supplierOperations,
  categoryOperations,
} from '../server';
import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { JsonObject } from '@/types/json';
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

  getInventoryStats: (sessionToken: string): Promise<InventoryStats> =>
    safeInvoke<InventoryStats>(IPC_COMMANDS.INVENTORY_GET_STATS, { sessionToken }),

  getMaterialBySku: (sessionToken: string, sku: string): Promise<Material | null> =>
    safeInvoke<Material | null>(IPC_COMMANDS.MATERIAL_GET_BY_SKU, { sessionToken, sku } as JsonObject),

  getInterventionConsumption: (sessionToken: string, interventionId: string): Promise<MaterialConsumption[]> =>
    safeInvoke<MaterialConsumption[]>(IPC_COMMANDS.MATERIAL_GET_INTERVENTION_CONSUMPTION, {
      sessionToken,
      interventionId,
    } as JsonObject),

  getInterventionSummary: (sessionToken: string, interventionId: string): Promise<InterventionMaterialSummary> =>
    safeInvoke<InterventionMaterialSummary>(IPC_COMMANDS.MATERIAL_GET_INTERVENTION_SUMMARY, {
      sessionToken,
      interventionId,
    } as JsonObject),

  getMaterialStats: (sessionToken: string): Promise<MaterialStats> =>
    safeInvoke<MaterialStats>(IPC_COMMANDS.MATERIAL_GET_STATS, { sessionToken } as JsonObject),

  getLowStockMaterials: (sessionToken: string): Promise<LowStockMaterialsResponse> =>
    reportingOperations.getLowStockMaterials(sessionToken),

  getMovementSummaries: (sessionToken: string): Promise<InventoryMovementSummary[]> =>
    safeInvoke<InventoryMovementSummary[]>(IPC_COMMANDS.MATERIAL_GET_INVENTORY_MOVEMENT_SUMMARY, { sessionToken } as JsonObject),

  /** S-1 perf: replaces 4 IPC calls (materials + stats + lowStock + expired) with 1. */
  getDashboardData: (sessionToken: string): Promise<InventoryDashboardData> =>
    safeInvoke<InventoryDashboardData>(IPC_COMMANDS.INVENTORY_GET_DASHBOARD_DATA, { sessionToken } as JsonObject),
};

