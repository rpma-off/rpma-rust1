import { renderHook, waitFor } from '@testing-library/react';
import { useInventory } from '../useInventory';
import { invoke } from '@tauri-apps/api/core';

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;

describe('useInventory', () => {
  const mockMaterials = [
    {
      id: 'material-1',
      sku: 'PPF-001',
      name: 'Clear PPF Film',
      material_type: 'ppf_film',
      current_stock: 50,
      minimum_stock: 20,
      maximum_stock: 500,
      unit_cost: 15.5,
      unit_of_measure: 'meter',
      created_at: '2025-02-09T10:00:00Z',
      updated_at: '2025-02-09T10:00:00Z',
    },
  ];

  const mockStats = {
    total_materials: 1,
    total_value: 775.0,
    low_stock_count: 0,
    expired_count: 0,
    material_types: {
      ppf_film: 1,
    },
  };

  const mockLowStock = [] as typeof mockMaterials;
  const mockExpired = [] as typeof mockMaterials;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInvoke.mockImplementation(async (command: string) => {
      switch (command) {
        case 'material_list':
          return mockMaterials;
        case 'inventory_get_stats':
          return mockStats;
        case 'material_get_low_stock':
          return mockLowStock;
        case 'material_get_expired':
          return mockExpired;
        case 'material_create':
        case 'material_update':
        case 'material_update_stock':
          return mockMaterials[0];
        case 'material_record_consumption':
          return { id: 'consumption-1' };
        case 'material_get':
        case 'material_get_by_sku':
          return mockMaterials[0];
        case 'material_get_intervention_consumption':
          return [];
        case 'material_get_intervention_summary':
          return { total_cost: 0, materials: [] };
        case 'material_get_stats':
          return { total_materials: 1, total_value: 775.0, low_stock_count: 0 };
        default:
          return null;
      }
    });
  });

  it('loads materials, stats, low stock, and expired lists on mount', async () => {
    const { result } = renderHook(() => useInventory());

    expect(result.current.loading).toBe(true);
    expect(result.current.materials).toEqual([]);
    expect(result.current.stats).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.materials).toEqual(mockMaterials);
    expect(result.current.stats).toEqual(mockStats);
    expect(result.current.lowStockMaterials).toEqual(mockLowStock);
    expect(result.current.expiredMaterials).toEqual(mockExpired);

    expect(mockInvoke).toHaveBeenCalledWith('material_list', expect.any(Object));
    expect(mockInvoke).toHaveBeenCalledWith('inventory_get_stats');
    expect(mockInvoke).toHaveBeenCalledWith('material_get_low_stock');
    expect(mockInvoke).toHaveBeenCalledWith('material_get_expired');
  });

  it('passes query options to material_list', async () => {
    renderHook(() =>
      useInventory({
        material_type: 'ppf_film',
        category: 'Films',
        active_only: true,
        limit: 10,
        offset: 20,
      })
    );

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('material_list', {
        materialType: 'ppf_film',
        category: 'Films',
        activeOnly: true,
        limit: 10,
        offset: 20,
      });
    });
  });

  it('sets error when material_list fails', async () => {
    mockInvoke.mockImplementation(async (command: string) => {
      if (command === 'material_list') {
        throw 'Failed to load inventory data';
      }
      return null;
    });

    const { result } = renderHook(() => useInventory());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Failed to load inventory data');
    });
  });

  it('creates a new material via material_create', async () => {
    const { result } = renderHook(() => useInventory());

    const newMaterial = {
      sku: 'NEW-001',
      name: 'New Material',
      material_type: 'ppf_film' as const,
      unit_of_measure: 'meter' as const,
    };

    const created = await result.current.createMaterial(newMaterial, 'user-1');

    expect(mockInvoke).toHaveBeenCalledWith('material_create', {
      request: newMaterial,
      userId: 'user-1',
    });
    expect(created).toEqual(mockMaterials[0]);
  });

  it('updates stock via material_update_stock', async () => {
    const { result } = renderHook(() => useInventory());

    const update = {
      material_id: 'material-1',
      quantity: 25,
      transaction_type: 'stock_in' as const,
      notes: 'Purchase order',
    };

    const updated = await result.current.updateStock(update);

    expect(mockInvoke).toHaveBeenCalledWith('material_update_stock', { request: update });
    expect(updated).toEqual(mockMaterials[0]);
  });

  it('refetches materials when refetch is called', async () => {
    const { result } = renderHook(() => useInventory());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockInvoke.mockClear();
    await result.current.refetch();

    expect(mockInvoke).toHaveBeenCalledWith('material_list', expect.any(Object));
  });
});
