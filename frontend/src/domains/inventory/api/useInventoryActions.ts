import { useInventory, type InventoryQuery } from '../hooks/useInventory';

export function useInventoryActions(query?: InventoryQuery) {
  const inventory = useInventory(query);

  return {
    createMaterial: inventory.createMaterial,
    updateMaterial: inventory.updateMaterial,
    updateStock: inventory.updateStock,
    recordConsumption: inventory.recordConsumption,
    getMaterial: inventory.getMaterial,
    getMaterialBySku: inventory.getMaterialBySku,
    getInterventionConsumption: inventory.getInterventionConsumption,
    getInterventionSummary: inventory.getInterventionSummary,
    getMaterialStats: inventory.getMaterialStats,
    refetch: inventory.refetch,
    refetchStats: inventory.refetchStats,
    refetchLowStock: inventory.refetchLowStock,
    refetchExpired: inventory.refetchExpired,
  };
}
