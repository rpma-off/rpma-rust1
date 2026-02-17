export { useInventory } from './useInventory';
export { useInventoryActions } from './useInventoryActions';
export { InventoryProvider, useInventoryContext } from './InventoryProvider';
export { useInventoryStats } from '../hooks/useInventoryStats';
export { useMaterials } from '../hooks/useMaterials';
export { useMaterialForm } from '../hooks/useMaterialForm';

export { InventoryDashboard } from '../components/InventoryDashboard';
export { InventoryLayout } from '../components/InventoryLayout';
export { InventoryManager } from '../components/InventoryManager';
export { InventoryReports } from '../components/InventoryReports';
export { InventorySettings } from '../components/InventorySettings';
export { InventoryTabs } from '../components/InventoryTabs';
export { MaterialCatalog } from '../components/MaterialCatalog';
export { MaterialForm } from '../components/MaterialForm';
export { StockLevelIndicator } from '../components/StockLevelIndicator';
export { SupplierManagement } from '../components/SupplierManagement';

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
} from './types';
