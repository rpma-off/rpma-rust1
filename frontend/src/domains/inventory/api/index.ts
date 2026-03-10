/** TODO: document */
export { useInventory } from './useInventory';
/** TODO: document */
export { useInventoryActions } from './useInventoryActions';
/** TODO: document */
export { InventoryProvider, useInventoryContext } from './InventoryProvider';
/** TODO: document */
export { useInventoryStats } from '../hooks/useInventoryStats';
/** TODO: document */
export { useMaterials } from '../hooks/useMaterials';
/** TODO: document */
export { useMaterialForm } from '../hooks/useMaterialForm';
/** TODO: document */
export { inventoryIpc } from '../ipc/inventory.ipc';

/** TODO: document */
export { InventoryDashboard } from '../components/InventoryDashboard';
/** TODO: document */
export { InventoryLayout } from '../components/InventoryLayout';
/** TODO: document */
export { InventoryManager } from '../components/InventoryManager';
/** TODO: document */
export { InventoryReports } from '../components/InventoryReports';
/** TODO: document */
export { InventorySettings } from '../components/InventorySettings';
/** TODO: document */
export { InventoryTabs } from '../components/InventoryTabs';
/** TODO: document */
export { MaterialCatalog } from '../components/MaterialCatalog';
/** TODO: document */
export { MaterialForm } from '../components/MaterialForm';
/** TODO: document */
export { StockLevelIndicator } from '../components/StockLevelIndicator';
/** TODO: document */
export { SupplierManagement } from '../components/SupplierManagement';

/** TODO: document */
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
} from './types';

/** TODO: document */
export type {
  InventoryQuery,
  CreateMaterialRequest,
  UpdateStockRequest,
  RecordConsumptionRequest,
} from '../hooks/useInventory';
