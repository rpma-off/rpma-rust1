// Re-exports from the generated backend contract (ADR-015 source of truth).
// Do not redefine types here — edit the Rust structs in
// src-tauri/src/domains/inventory/ then run `npm run types:sync`.
export type {
  MaterialType,
  UnitOfMeasure,
  InventoryTransactionType,
  Material,
  MaterialConsumption,
  MaterialStats,
  InventoryStats,
  InventoryTransaction,
  Supplier,
  MaterialCategory,
  InterventionMaterialSummary,
  MaterialConsumptionSummary,
  InventoryMovementSummary,
  LowStockMaterial,
  LowStockMaterialsResponse,
  InventoryDashboardData,
} from '@/lib/backend';

// NOT re-exported — bigint timestamp variants generated from Rust *TS structs:
// MaterialTS, MaterialConsumptionTS, InventoryTransactionTS
// UNUSED: verify with backend team whether these Rust structs are still needed.
