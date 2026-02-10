import { renderHook, act, waitFor } from '@testing-library/react';
import { useInventory } from '../useInventory';
import { invoke } from '@tauri-apps/api/core';
import { Material, MaterialType, UnitOfMeasure, InventoryStats } from '@/lib/inventory';

// Mock the Tauri invoke function
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;

// Mock material data
const mockMaterial: Material = {
  id: '1',
  sku: 'PPF-001',
  name: 'PPF Film Standard',
  description: 'Standard PPF film for vehicles',
  material_type: 'ppf_film' as MaterialType,
  category: 'Films',
  subcategory: 'Standard',
  category_id: 'cat-1',
  brand: '3M',
  model: 'Pro',
  specifications: {},
  unit_of_measure: 'meter' as UnitOfMeasure,
  current_stock: 100.5,
  minimum_stock: 10,
  maximum_stock: 200,
  reorder_point: 15,
  unit_cost: 25.50,
  currency: 'EUR',
  supplier_id: 'sup-1',
  supplier_name: '3M Supplier',
  supplier_sku: '3M-PPF-001',
  quality_grade: 'A',
  certification: 'ISO-9001',
  expiry_date: '2024-12-31T23:59:59Z',
  batch_number: 'BATCH-001',
  serial_numbers: [],
  is_active: true,
  is_discontinued: false,
  storage_location: 'Warehouse A-1',
  warehouse_id: 'wh-1',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  created_by: 'user-1',
  updated_by: 'user-1',
  synced: true,
  last_synced_at: '2023-01-01T00:00:00Z',
};

// Mock inventory stats
const mockStats: InventoryStats = {
  total_materials: 50,
  active_materials: 45,
  low_stock_materials: 3,
  expired_materials: 1,
  total_value: 10000.50,
  materials_by_category: { 'Films': 20, 'Tools': 15, 'Consumables': 15 },
  recent_transactions: [],
  stock_turnover_rate: 2.5,
  average_inventory_age: 30.5,
};

describe('useInventory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial loading', () => {
    it('should load materials and stats on mount', async () => {
      mockInvoke
        .mockResolvedValueOnce([mockMaterial]) // material_list
        .mockResolvedValueOnce(mockStats) // inventory_get_stats
        .mockResolvedValueOnce([mockMaterial]) // material_get_low_stock
        .mockResolvedValueOnce([mockMaterial]); // material_get_expired

      const { result } = renderHook(() => useInventory());

      expect(result.current.loading).toBe(true);
      expect(result.current.materials).toEqual([]);
      expect(result.current.stats).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.materials).toEqual([mockMaterial]);
      expect(result.current.stats).toEqual(mockStats);
      expect(result.current.lowStockMaterials).toEqual([mockMaterial]);
      expect(result.current.expiredMaterials).toEqual([mockMaterial]);

      expect(mockInvoke).toHaveBeenCalledWith('material_list', {
        materialType: undefined,
        category: undefined,
        activeOnly: true,
        limit: undefined,
        offset: undefined,
      });
      expect(mockInvoke).toHaveBeenCalledWith('inventory_get_stats');
      expect(mockInvoke).toHaveBeenCalledWith('material_get_low_stock');
      expect(mockInvoke).toHaveBeenCalledWith('material_get_expired');
    });

    it('should handle loading errors', async () => {
      const errorMessage = 'Failed to load materials';
      mockInvoke.mockRejectedValue(errorMessage);

      const { result } = renderHook(() => useInventory());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.materials).toEqual([]);
    });
  });

  describe('createMaterial', () => {
    it('should create a new material successfully', async () => {
      const newMaterial = { ...mockMaterial, id: '2', name: 'New Material' };
      const createRequest = {
        sku: 'NEW-001',
        name: 'New Material',
        material_type: 'ppf_film' as MaterialType,
        unit_of_measure: 'meter' as UnitOfMeasure,
        current_stock: 50,
      };

      mockInvoke
        .mockResolvedValueOnce([mockMaterial]) // Initial load
        .mockResolvedValueOnce(mockStats) // Initial stats
        .mockResolvedValueOnce([mockMaterial]) // Initial low stock
        .mockResolvedValueOnce([mockMaterial]) // Initial expired
        .mockResolvedValueOnce(newMaterial) // material_create
        .mockResolvedValueOnce([newMaterial, mockMaterial]) // Updated materials list
        .mockResolvedValueOnce(mockStats) // Updated stats
        .mockResolvedValueOnce([newMaterial]) // Updated low stock
        .mockResolvedValueOnce([newMaterial]); // Updated expired

      const { result } = renderHook(() => useInventory());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        const createdMaterial = await result.current.createMaterial(createRequest, 'user-1');
        expect(createdMaterial).toEqual(newMaterial);
      });

      expect(mockInvoke).toHaveBeenCalledWith('material_create', {
        request: createRequest,
        userId: 'user-1',
      });

      // Verify refetch calls
      expect(mockInvoke).toHaveBeenCalledTimes(8); // 4 initial + 4 after create
    });

    it('should handle create material errors', async () => {
      const errorMessage = 'Failed to create material';
      const createRequest = {
        sku: 'NEW-001',
        name: 'New Material',
        material_type: 'ppf_film' as MaterialType,
        unit_of_measure: 'meter' as UnitOfMeasure,
        current_stock: 50,
      };

      mockInvoke
        .mockResolvedValueOnce([mockMaterial]) // Initial load
        .mockResolvedValueOnce(mockStats) // Initial stats
        .mockResolvedValueOnce([mockMaterial]) // Initial low stock
        .mockResolvedValueOnce([mockMaterial]) // Initial expired
        .mockRejectedValue(errorMessage); // material_create

      const { result } = renderHook(() => useInventory());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.createMaterial(createRequest, 'user-1');
        })
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('updateMaterial', () => {
    it('should update a material successfully', async () => {
      const updatedMaterial = { ...mockMaterial, name: 'Updated Material' };
      const updateRequest = {
        sku: 'PPF-001',
        name: 'Updated Material',
        material_type: 'ppf_film' as MaterialType,
        unit_of_measure: 'meter' as UnitOfMeasure,
        current_stock: 100,
      };

      mockInvoke
        .mockResolvedValueOnce([mockMaterial]) // Initial load
        .mockResolvedValueOnce(mockStats) // Initial stats
        .mockResolvedValueOnce([mockMaterial]) // Initial low stock
        .mockResolvedValueOnce([mockMaterial]) // Initial expired
        .mockResolvedValueOnce(updatedMaterial) // material_update
        .mockResolvedValueOnce([updatedMaterial]) // Updated materials list
        .mockResolvedValueOnce(mockStats) // Updated stats
        .mockResolvedValueOnce([updatedMaterial]) // Updated low stock
        .mockResolvedValueOnce([updatedMaterial]); // Updated expired

      const { result } = renderHook(() => useInventory());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        const material = await result.current.updateMaterial('1', updateRequest, 'user-1');
        expect(material).toEqual(updatedMaterial);
      });

      expect(mockInvoke).toHaveBeenCalledWith('material_update', {
        id: '1',
        request: updateRequest,
        userId: 'user-1',
      });
    });
  });

  describe('updateStock', () => {
    it('should update material stock successfully', async () => {
      const stockRequest = {
        material_id: '1',
        quantity: 50,
        transaction_type: 'stock_in' as const,
        notes: 'Restock',
      };

      const updatedMaterial = { ...mockMaterial, current_stock: 150.5 };

      mockInvoke
        .mockResolvedValueOnce([mockMaterial]) // Initial load
        .mockResolvedValueOnce(mockStats) // Initial stats
        .mockResolvedValueOnce([mockMaterial]) // Initial low stock
        .mockResolvedValueOnce([mockMaterial]) // Initial expired
        .mockResolvedValueOnce(updatedMaterial) // material_update_stock
        .mockResolvedValueOnce([updatedMaterial]) // Updated materials list
        .mockResolvedValueOnce(mockStats) // Updated stats
        .mockResolvedValueOnce([updatedMaterial]) // Updated low stock
        .mockResolvedValueOnce([updatedMaterial]); // Updated expired

      const { result } = renderHook(() => useInventory());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        const material = await result.current.updateStock(stockRequest);
        expect(material).toEqual(updatedMaterial);
      });

      expect(mockInvoke).toHaveBeenCalledWith('material_update_stock', {
        request: stockRequest,
      });
    });
  });

  describe('getMaterial', () => {
    it('should get a material by ID successfully', async () => {
      mockInvoke.mockResolvedValueOnce(mockMaterial);

      const { result } = renderHook(() => useInventory());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const material = await result.current.getMaterial('1');
      expect(material).toEqual(mockMaterial);
      expect(mockInvoke).toHaveBeenCalledWith('material_get', { id: '1' });
    });

    it('should return null for non-existent material', async () => {
      mockInvoke.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useInventory());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const material = await result.current.getMaterial('non-existent');
      expect(material).toBe(null);
    });
  });

  describe('getMaterialBySku', () => {
    it('should get a material by SKU successfully', async () => {
      mockInvoke.mockResolvedValueOnce(mockMaterial);

      const { result } = renderHook(() => useInventory());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const material = await result.current.getMaterialBySku('PPF-001');
      expect(material).toEqual(mockMaterial);
      expect(mockInvoke).toHaveBeenCalledWith('material_get_by_sku', { sku: 'PPF-001' });
    });
  });

  describe('with query parameters', () => {
    it('should pass query parameters to material_list', async () => {
      const query = {
        material_type: 'ppf_film' as MaterialType,
        category: 'Films',
        active_only: false,
        limit: 50,
        offset: 10,
      };

      mockInvoke
        .mockResolvedValueOnce([mockMaterial]) // material_list
        .mockResolvedValueOnce(mockStats) // inventory_get_stats
        .mockResolvedValueOnce([mockMaterial]) // material_get_low_stock
        .mockResolvedValueOnce([mockMaterial]); // material_get_expired

      renderHook(() => useInventory(query));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('material_list', {
          materialType: 'ppf_film',
          category: 'Films',
          activeOnly: false,
          limit: 50,
          offset: 10,
        });
      });
    });
  });

  describe('refetch functions', () => {
    it('should refetch materials when refetch is called', async () => {
      mockInvoke
        .mockResolvedValueOnce([mockMaterial]) // Initial load
        .mockResolvedValueOnce(mockStats) // Initial stats
        .mockResolvedValueOnce([mockMaterial]) // Initial low stock
        .mockResolvedValueOnce([mockMaterial]); // Initial expired

      const { result } = renderHook(() => useInventory());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newMaterial = { ...mockMaterial, name: 'New Material' };
      mockInvoke.mockResolvedValueOnce([newMaterial]); // Refetch

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.materials).toEqual([newMaterial]);
    });
  });
});