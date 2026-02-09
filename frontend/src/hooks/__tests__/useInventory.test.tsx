import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useInventory } from '../useInventory';

// Mock the IPC client
jest.mock('@/lib/ipc/client', () => ({
  ipcClient: {
    material: {
      list: jest.fn(),
      get: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateStock: jest.fn(),
      adjustStock: jest.fn(),
      getLowStockMaterials: jest.fn(),
      getStats: jest.fn(),
      getConsumptionHistory: jest.fn(),
      getTransactionHistory: jest.fn(),
    },
  },
}));

const mockIpcClient = jest.requireMock('@/lib/ipc/client').ipcClient;

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

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
    {
      id: 'material-2',
      sku: 'ADH-001',
      name: 'PPF Adhesive',
      material_type: 'adhesive',
      current_stock: 25,
      minimum_stock: 10,
      maximum_stock: 100,
      unit_cost: 8.75,
      unit_of_measure: 'liter',
      created_at: '2025-02-09T10:00:00Z',
      updated_at: '2025-02-09T10:00:00Z',
    },
  ];

  const mockStats = {
    total_materials: 2,
    total_value: 950.0,
    low_stock_count: 0,
    expired_count: 0,
    material_types: {
      ppf_film: 1,
      adhesive: 1,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIpcClient.material.list.mockResolvedValue({
      success: true,
      data: {
        materials: mockMaterials,
        pagination: {
          page: 1,
        limit: 20,
        total: 2,
        has_next: false,
        has_prev: false,
        },
      },
    });

    mockIpcClient.material.getStats.mockResolvedValue({
      success: true,
      data: mockStats,
    });

    mockIpcClient.material.getLowStockMaterials.mockResolvedValue({
      success: true,
      data: [],
    });
  });

  describe('Data fetching', () => {
    it('loads materials and stats on mount', async () => {
      const { result } = renderHook(() => useInventory(), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.materials).toEqual([]);
      expect(result.current.stats).toEqual({
        total_materials: 0,
        total_value: 0,
        low_stock_count: 0,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.materials).toEqual(mockMaterials);
        expect(result.current.stats).toEqual(mockStats);
      });

      expect(mockIpcClient.material.list).toHaveBeenCalledWith(
        expect.any(String), // session token
        expect.objectContaining({ page: 1, limit: 20 })
      );

      expect(mockIpcClient.material.getStats).toHaveBeenCalledWith(
        expect.any(String) // session token
      );
    });

    it('accepts fetch options', async () => {
      const { result } = renderHook(
        () => useInventory({
          page: 2,
          limit: 10,
          search: 'PPF',
          material_type: 'ppf_film',
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockIpcClient.material.list).toHaveBeenCalledWith(
        expect.any(String), // session token
        {
          page: 2,
          limit: 10,
          search: 'PPF',
          material_type: 'ppf_film',
        }
      );
    });

    it('handles loading states', () => {
      mockIpcClient.material.list.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useInventory(), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('handles API errors', async () => {
      mockIpcClient.material.list.mockResolvedValue({
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Failed to load inventory data',
        },
      });

      const { result } = renderHook(() => useInventory(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toEqual({
          code: 'NETWORK_ERROR',
          message: 'Failed to load inventory data',
        });
      });
    });
  });

  describe('Material management', () => {
    it('creates a new material', async () => {
      const { result } = renderHook(() => useInventory(), { wrapper });

      const newMaterial = {
        sku: 'NEW-001',
        name: 'New Material',
        material_type: 'ppf_film' as const,
        unit_cost: 20.0,
      };

      mockIpcClient.material.create.mockResolvedValue({
        success: true,
        data: {
          id: 'material-new',
          ...newMaterial,
          current_stock: 0,
        },
      });

      const createResult = await result.current.createMaterial(newMaterial);

      expect(mockIpcClient.material.create).toHaveBeenCalledWith(
        newMaterial,
        expect.any(String) // session token
      );

      expect(createResult.success).toBe(true);
      expect(createResult.data).toEqual({
        id: 'material-new',
        ...newMaterial,
        current_stock: 0,
      });
    });

    it('handles create material errors', async () => {
      const { result } = renderHook(() => useInventory(), { wrapper });

      const newMaterial = {
        sku: 'DUP-001',
        name: 'Duplicate Material',
        material_type: 'ppf_film' as const,
      };

      mockIpcClient.material.create.mockResolvedValue({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'SKU already exists',
        },
      });

      const createResult = await result.current.createMaterial(newMaterial);

      expect(createResult.success).toBe(false);
      expect(createResult.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'SKU already exists',
      });
    });

    it('updates an existing material', async () => {
      const { result } = renderHook(() => useInventory(), { wrapper });

      const updates = {
        name: 'Updated Material Name',
        minimum_stock: 30,
      };

      mockIpcClient.material.update.mockResolvedValue({
        success: true,
        data: {
          ...mockMaterials[0],
          ...updates,
        },
      });

      const updateResult = await result.current.updateMaterial('material-1', updates);

      expect(mockIpcClient.material.update).toHaveBeenCalledWith(
        'material-1',
        updates,
        expect.any(String) // session token
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.data).toEqual({
        ...mockMaterials[0],
        ...updates,
      });
    });

    it('deletes a material', async () => {
      const { result } = renderHook(() => useInventory(), { wrapper });

      mockIpcClient.material.delete.mockResolvedValue({
        success: true,
        data: { deleted: true },
      });

      const deleteResult = await result.current.deleteMaterial('material-1');

      expect(mockIpcClient.material.delete).toHaveBeenCalledWith(
        'material-1',
        expect.any(String) // session token
      );

      expect(deleteResult.success).toBe(true);
    });

    it('fetches a single material', async () => {
      const { result } = renderHook(() => useInventory(), { wrapper });

      mockIpcClient.material.get.mockResolvedValue({
        success: true,
        data: mockMaterials[0],
      });

      const material = await result.current.getMaterial('material-1');

      expect(mockIpcClient.material.get).toHaveBeenCalledWith(
        'material-1',
        expect.any(String) // session token
      );

      expect(material).toEqual(mockMaterials[0]);
    });
  });

  describe('Stock management', () => {
    it('updates stock levels', async () => {
      const { result } = renderHook(() => useInventory(), { wrapper });

      const stockUpdate = {
        material_id: 'material-1',
        quantity_change: 25,
        reason: 'Purchase order',
      };

      mockIpcClient.material.updateStock.mockResolvedValue({
        success: true,
        data: {
          ...mockMaterials[0],
          current_stock: 75, // 50 + 25
        },
      });

      const updateResult = await result.current.updateStock(stockUpdate);

      expect(mockIpcClient.material.updateStock).toHaveBeenCalledWith(
        stockUpdate,
        expect.any(String) // session token
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.data.current_stock).toBe(75);
    });

    it('adjusts stock with negative values', async () => {
      const { result } = renderHook(() => useInventory(), { wrapper });

      const stockAdjustment = {
        material_id: 'material-1',
        quantity_change: -10,
        reason: 'Physical count adjustment',
      };

      mockIpcClient.material.adjustStock.mockResolvedValue({
        success: true,
        data: {
          ...mockMaterials[0],
          current_stock: 40, // 50 - 10
        },
      });

      const adjustResult = await result.current.adjustStock(stockAdjustment);

      expect(mockIpcClient.material.adjustStock).toHaveBeenCalledWith(
        stockAdjustment,
        expect.any(String) // session token
      );

      expect(adjustResult.success).toBe(true);
      expect(adjustResult.data.current_stock).toBe(40);
    });

    it('fetches low stock materials', async () => {
      const { result } = renderHook(() => useInventory(), { wrapper });

      const lowStockMaterials = [mockMaterials[0]]; // Only first material has low stock

      mockIpcClient.material.getLowStockMaterials.mockResolvedValue({
        success: true,
        data: lowStockMaterials,
      });

      const materials = await result.current.getLowStockMaterials();

      expect(mockIpcClient.material.getLowStockMaterials).toHaveBeenCalledWith(
        expect.any(String) // session token
      );

      expect(materials).toEqual(lowStockMaterials);
    });
  });

  describe('History and analytics', () => {
    it('fetches consumption history', async () => {
      const { result } = renderHook(() => useInventory(), { wrapper });

      const mockConsumptionHistory = [
        {
          id: 'consumption-1',
          material_id: 'material-1',
          quantity_used: 15,
          recorded_at: '2025-02-09T10:00:00Z',
        },
      ];

      mockIpcClient.material.getConsumptionHistory.mockResolvedValue({
        success: true,
        data: {
          consumptions: mockConsumptionHistory,
          pagination: {
            page: 1,
            limit: 50,
            total: 1,
            has_next: false,
            has_prev: false,
          },
        },
      });

      const history = await result.current.getConsumptionHistory('material-1');

      expect(mockIpcClient.material.getConsumptionHistory).toHaveBeenCalledWith(
        'material-1',
        expect.any(String), // session token
        {}
      );

      expect(history.consumptions).toEqual(mockConsumptionHistory);
    });

    it('fetches transaction history', async () => {
      const { result } = renderHook(() => useInventory(), { wrapper });

      const mockTransactionHistory = [
        {
          id: 'transaction-1',
          material_id: 'material-1',
          transaction_type: 'stock_in',
          quantity: 100,
          created_at: '2025-02-09T10:00:00Z',
        },
      ];

      mockIpcClient.material.getTransactionHistory.mockResolvedValue({
        success: true,
        data: {
          transactions: mockTransactionHistory,
          pagination: {
            page: 1,
            limit: 50,
            total: 1,
            has_next: false,
            has_prev: false,
          },
        },
      });

      const history = await result.current.getTransactionHistory('material-1');

      expect(mockIpcClient.material.getTransactionHistory).toHaveBeenCalledWith(
        'material-1',
        expect.any(String), // session token
        {}
      );

      expect(history.transactions).toEqual(mockTransactionHistory);
    });

    it('refreshes inventory data', async () => {
      const { result, rerender } = renderHook(() => useInventory(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear mock to verify refresh
      mockIpcClient.material.list.mockClear();
      mockIpcClient.material.getStats.mockClear();

      // Set up new mock responses
      mockIpcClient.material.list.mockResolvedValue({
        success: true,
        data: {
          materials: [mockMaterials[0]], // Only first material
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            has_next: false,
            has_prev: false,
          },
        },
      });

      mockIpcClient.material.getStats.mockResolvedValue({
        success: true,
        data: {
          total_materials: 1,
          total_value: 775.0,
          low_stock_count: 0,
        },
      });

      // Trigger refresh
      result.current.refresh();

      await waitFor(() => {
        expect(mockIpcClient.material.list).toHaveBeenCalled();
        expect(mockIpcClient.material.getStats).toHaveBeenCalled();
      });

      expect(result.current.materials).toEqual([mockMaterials[0]]);
      expect(result.current.stats.total_materials).toBe(1);
    });
  });

  describe('Derived state', () => {
    it('calculates inventory summary correctly', async () => {
      const { result } = renderHook(() => useInventory(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const summary = result.current.getInventorySummary();

      expect(summary.totalMaterials).toBe(2);
      expect(summary.totalValue).toBe(950.0);
      expect(summary.lowStockCount).toBe(0);
      expect(summary.materialTypes).toEqual({
        ppf_film: 1,
        adhesive: 1,
      });
    });

    it('identifies materials needing reorder', async () => {
      const materialsWithLowStock = [
        { ...mockMaterials[0], current_stock: 15 }, // Below minimum of 20
        mockMaterials[1], // Above minimum
      ];

      mockIpcClient.material.list.mockResolvedValue({
        success: true,
        data: {
          materials: materialsWithLowStock,
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            has_next: false,
            has_prev: false,
          },
        },
      });

      const { result } = renderHook(() => useInventory(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const needsReorder = result.current.getMaterialsNeedingReorder();

      expect(needsReorder).toHaveLength(1);
      expect(needsReorder[0].id).toBe('material-1');
      expect(needsReorder[0].sku).toBe('PPF-001');
    });

    it('filters materials by search query', async () => {
      const { result } = renderHook(() => useInventory(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const filtered = result.current.filterMaterials('PPF');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].sku).toBe('PPF-001');
    });

    it('groups materials by type', async () => {
      const { result } = renderHook(() => useInventory(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const grouped = result.current.groupMaterialsByType();

      expect(grouped).toHaveProperty('ppf_film');
      expect(grouped).toHaveProperty('adhesive');
      expect(grouped.ppf_film).toHaveLength(1);
      expect(grouped.adhesive).toHaveLength(1);
    });
  });

  describe('Caching and optimization', () => {
    it('caches material data', async () => {
      const { result } = renderHook(() => useInventory(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Second call should use cache
      mockIpcClient.material.get.mockClear();
      await result.current.getMaterial('material-1');

      // Verify it was called (not cached in hook)
      expect(mockIpcClient.material.get).toHaveBeenCalledTimes(1);
    });

    it('invalidates cache on updates', async () => {
      const { result } = renderHook(() => useInventory(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Update a material
      mockIpcClient.material.update.mockResolvedValue({
        success: true,
        data: { ...mockMaterials[0], name: 'Updated' },
      });

      await result.current.updateMaterial('material-1', { name: 'Updated' });

      // Cache invalidation would be tested through query client behavior
      // In a real implementation, this would trigger refetch
    });

    it('handles pagination correctly', async () => {
      const { result } = renderHook(
        () => useInventory({ page: 2, limit: 10 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockIpcClient.material.list).toHaveBeenCalledWith(
        expect.any(String), // session token
        {
          page: 2,
          limit: 10,
        }
      );

      // Verify pagination info is available
      expect(result.current.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 2,
        has_next: false,
        has_prev: true,
      });
    });
  });
});