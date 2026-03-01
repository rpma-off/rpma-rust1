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
    safeInvoke<Material | null>('material_get_by_sku', { sessionToken, sku } as JsonObject),

  getInterventionConsumption: (sessionToken: string, interventionId: string): Promise<MaterialConsumption[]> =>
    safeInvoke<MaterialConsumption[]>('material_get_intervention_consumption', {
      sessionToken,
      interventionId,
    } as JsonObject),

  getInterventionSummary: (sessionToken: string, interventionId: string): Promise<InterventionMaterialSummary> =>
    safeInvoke<InterventionMaterialSummary>('material_get_intervention_summary', {
      sessionToken,
      interventionId,
    } as JsonObject),

  getMaterialStats: (sessionToken: string): Promise<MaterialStats> =>
    safeInvoke<MaterialStats>(IPC_COMMANDS.MATERIAL_GET_STATS, { sessionToken } as JsonObject),

  getLowStockMaterials: (sessionToken: string): Promise<Material[]> =>
    safeInvoke<Material[]>(IPC_COMMANDS.MATERIAL_GET_LOW_STOCK_MATERIALS, { sessionToken } as JsonObject),

  getMovementSummaries: (sessionToken: string): Promise<InventoryMovementSummary[]> =>
    safeInvoke<InventoryMovementSummary[]>(IPC_COMMANDS.MATERIAL_GET_INVENTORY_MOVEMENT_SUMMARY, { sessionToken } as JsonObject),
};

