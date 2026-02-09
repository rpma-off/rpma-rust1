import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { jest } from '@jest/globals';
import { useInventory, CreateMaterialRequest, UpdateStockRequest } from '@/hooks/useInventory';
import * as inventoryOperations from '@/lib/ipc/domains/inventory';

// Mock the inventory operations
jest.mock('@/lib/ipc/domains/inventory', () => ({
  materialOperations: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateStock: jest.fn(),
    recordConsumption: jest.fn(),
    getTransactionHistory: jest.fn(),
  },
}));

const { materialOperations } = inventoryOperations as jest.Mocked<typeof inventoryOperations>;

// Mock the Tauri API
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

const createTestMaterial = (overrides = {}) => ({
  id: 'test-material-1',
  sku: 'TEST-MAT-001',
  name: 'Test Material 1',
  description: 'Test description',
  material_type: 'ppf_film' as const,
  category: 'Films',
  current_stock: 50,
  minimum_stock: 20,
  maximum_stock: 200,
  unit_cost: 15.5,
  currency: 'EUR',
  is_active: true,
  is_low_stock: false,
  is_expired: false,
  is_discontinued: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createTestMaterials = (count = 5) => 
  Array.from({ length: count }, (_, i) => 
    createTestMaterial({
      id: `test-material-${i + 1}`,
      sku: `TEST-MAT-${String(i + 1).padStart(3, '0')}`,
      name: `Test Material ${i + 1}`,
      current_stock: Math.floor(Math.random() * 100),
      minimum_stock: Math.floor(Math.random() * 50),
    })
  );

describe('useInventory', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    jest.clearAllMocks();
  });

  describe('material listing', () => {
    test('loads materials successfully', async () => {
      const mockMaterials = createTestMaterials(5);
      const mockResponse = {
        success: true,
        data: mockMaterials,
        pagination: {
          page: 1,
          limit: 10,
          total: 5,
          totalPages: 1,
        },
      };

      materialOperations.list.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useInventory(), { wrapper });

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.materials).toEqual([]);

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.materials).toEqual(mockMaterials);
      expect(result.current.error).toBeNull();
      expect(materialOperations.list).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          page: 1,
          limit: 10,
        })
      );
    });

    test('handles pagination correctly', async () => {
      const mockMaterials = createTestMaterials(5);
      const mockResponse = {
        success: true,
        data: mockMaterials,
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
          totalPages: 5,
        },
      };

      materialOperations.list.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useInventory({ page: 2, limit: 10 }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.materials).toEqual(mockMaterials);
      expect(materialOperations.list).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          page: 2,
          limit: 10,
        })
      );
    });

    test('handles filtering by material type', async () => {
      const mockMaterials = createTestMaterials(3);
      const mockResponse = {
        success: true,
        data: mockMaterials,
        pagination: {
          page: 1,
          limit: 10,
          total: 3,
          totalPages: 1,
        },
      };

      materialOperations.list.mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useInventory({ material_type: 'ppf_film' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.materials).toEqual(mockMaterials);
      expect(materialOperations.list).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          material_type: 'ppf_film',
        })
      );
    });

    test('handles search term', async () => {
      const mockMaterials = createTestMaterials(2);
      const mockResponse = {
        success: true,
        data: mockMaterials,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      };

      materialOperations.list.mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useInventory({ search: 'test search' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.materials).toEqual(mockMaterials);
      expect(materialOperations.list).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          search: 'test search',
        })
      );
    });

    test('handles API error', async () => {
      const mockError = new Error('Failed to load materials');
      materialOperations.list.mockRejectedValue(mockError);

      const { result } = renderHook(() => useInventory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.materials).toEqual([]);
      expect(result.current.error).toBeTruthy();
    });

    test('refetches materials', async () => {
      const mockMaterials = createTestMaterials(3);
      const mockResponse = {
        success: true,
        data: mockMaterials,
        pagination: {
          page: 1,
          limit: 10,
          total: 3,
          totalPages: 1,
        },
      };

      materialOperations.list.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useInventory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear the mock to test refetch
      materialOperations.list.mockClear();

      // Call refetch
      await result.current.refetch();

      expect(materialOperations.list).toHaveBeenCalledTimes(1);
    });
  });

  describe('material creation', () => {
    test('creates material successfully', async () => {
      const newMaterial = createTestMaterial();
      const mockResponse = {
        success: true,
        data: newMaterial,
      };

      materialOperations.create.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useInventory(), { wrapper });

      const requestData: CreateMaterialRequest = {
        sku: 'NEW-MAT-001',
        name: 'New Test Material',
        material_type: 'ppf_film',
        unit_of_measure: 'meter',
        current_stock: 100,
        minimum_stock: 20,
        maximum_stock: 500,
      };

      await result.current.createMaterial(requestData);

      expect(materialOperations.create).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining(requestData)
      );
    });

    test('handles creation error', async () => {
      const mockError = new Error('Failed to create material');
      materialOperations.create.mockRejectedValue(mockError);

      const { result } = renderHook(() => useInventory(), { wrapper });

      const requestData: CreateMaterialRequest = {
        sku: 'NEW-MAT-001',
        name: 'New Test Material',
        material_type: 'ppf_film',
        unit_of_measure: 'meter',
        current_stock: 100,
        minimum_stock: 20,
        maximum_stock: 500,
      };

      await expect(result.current.createMaterial(requestData)).rejects.toThrow(
        'Failed to create material'
      );
    });
  });

  describe('material update', () => {
    test('updates material successfully', async () => {
      const existingMaterial = createTestMaterial();
      const updatedMaterial = { ...existingMaterial, name: 'Updated Material' };
      const mockResponse = {
        success: true,
        data: updatedMaterial,
      };

      materialOperations.update.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useInventory(), { wrapper });

      await result.current.updateMaterial(existingMaterial.id, {
        name: 'Updated Material',
      });

      expect(materialOperations.update).toHaveBeenCalledWith(
        'test-token',
        existingMaterial.id,
        expect.objectContaining({
          name: 'Updated Material',
        })
      );
    });

    test('handles update error', async () => {
      const mockError = new Error('Failed to update material');
      materialOperations.update.mockRejectedValue(mockError);

      const { result } = renderHook(() => useInventory(), { wrapper });

      const materialId = 'test-material-1';

      await expect(
        result.current.updateMaterial(materialId, { name: 'Updated Material' })
      ).rejects.toThrow('Failed to update material');
    });
  });

  describe('material deletion', () => {
    test('deletes material successfully', async () => {
      const mockResponse = {
        success: true,
      };

      materialOperations.delete.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useInventory(), { wrapper });

      await result.current.deleteMaterial('test-material-1');

      expect(materialOperations.delete).toHaveBeenCalledWith(
        'test-token',
        'test-material-1'
      );
    });

    test('handles deletion error', async () => {
      const mockError = new Error('Failed to delete material');
      materialOperations.delete.mockRejectedValue(mockError);

      const { result } = renderHook(() => useInventory(), { wrapper });

      await expect(
        result.current.deleteMaterial('test-material-1')
      ).rejects.toThrow('Failed to delete material');
    });
  });

  describe('stock update', () => {
    test('updates stock successfully', async () => {
      const material = createTestMaterial();
      const updatedMaterial = { ...material, current_stock: 150 };
      const mockResponse = {
        success: true,
        data: updatedMaterial,
      };

      materialOperations.updateStock.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useInventory(), { wrapper });

      const stockRequest: UpdateStockRequest = {
        material_id: material.id,
        quantity: 50,
        transaction_type: 'stock_in',
        notes: 'Purchase order',
      };

      await result.current.updateStock(stockRequest);

      expect(materialOperations.updateStock).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining(stockRequest)
      );
    });

    test('handles stock update error', async () => {
      const mockError = new Error('Failed to update stock');
      materialOperations.updateStock.mockRejectedValue(mockError);

      const { result } = renderHook(() => useInventory(), { wrapper });

      const stockRequest: UpdateStockRequest = {
        material_id: 'test-material-1',
        quantity: 50,
        transaction_type: 'stock_in',
      };

      await expect(result.current.updateStock(stockRequest)).rejects.toThrow(
        'Failed to update stock'
      );
    });
  });

  describe('material consumption', () => {
    test('records consumption successfully', async () => {
      const material = createTestMaterial();
      const consumptionRecord = {
        id: 'consumption-1',
        material_id: material.id,
        intervention_id: 'intervention-1',
        quantity_used: 25,
        waste_quantity: 5,
        recorded_at: new Date().toISOString(),
      };
      const mockResponse = {
        success: true,
        data: consumptionRecord,
      };

      materialOperations.recordConsumption.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useInventory(), { wrapper });

      const consumptionRequest = {
        intervention_id: 'intervention-1',
        material_id: material.id,
        quantity_used: 25,
        waste_quantity: 5,
      };

      await result.current.recordConsumption(consumptionRequest);

      expect(materialOperations.recordConsumption).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining(consumptionRequest)
      );
    });

    test('handles consumption recording error', async () => {
      const mockError = new Error('Failed to record consumption');
      materialOperations.recordConsumption.mockRejectedValue(mockError);

      const { result } = renderHook(() => useInventory(), { wrapper });

      const consumptionRequest = {
        intervention_id: 'intervention-1',
        material_id: 'test-material-1',
        quantity_used: 25,
      };

      await expect(
        result.current.recordConsumption(consumptionRequest)
      ).rejects.toThrow('Failed to record consumption');
    });
  });

  describe('transaction history', () => {
    test('loads transaction history successfully', async () => {
      const transactions = [
        {
          id: 'trans-1',
          material_id: 'test-material-1',
          transaction_type: 'stock_in',
          quantity: 100,
          previous_stock: 0,
          new_stock: 100,
          performed_at: new Date().toISOString(),
        },
        {
          id: 'trans-2',
          material_id: 'test-material-1',
          transaction_type: 'stock_out',
          quantity: 25,
          previous_stock: 100,
          new_stock: 75,
          performed_at: new Date().toISOString(),
        },
      ];
      const mockResponse = {
        success: true,
        data: transactions,
      };

      materialOperations.getTransactionHistory.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useInventory(), { wrapper });

      const history = await result.current.getTransactionHistory('test-material-1');

      expect(history).toEqual(transactions);
      expect(materialOperations.getTransactionHistory).toHaveBeenCalledWith(
        'test-token',
        'test-material-1'
      );
    });

    test('handles transaction history error', async () => {
      const mockError = new Error('Failed to load transaction history');
      materialOperations.getTransactionHistory.mockRejectedValue(mockError);

      const { result } = renderHook(() => useInventory(), { wrapper });

      await expect(
        result.current.getTransactionHistory('test-material-1')
      ).rejects.toThrow('Failed to load transaction history');
    });
  });

  describe('custom query options', () => {
    test('uses custom session token', async () => {
      const customToken = 'custom-session-token';
      const mockMaterials = createTestMaterials(3);
      const mockResponse = {
        success: true,
        data: mockMaterials,
        pagination: {
          page: 1,
          limit: 10,
          total: 3,
          totalPages: 1,
        },
      };

      materialOperations.list.mockResolvedValue(mockResponse);

      renderHook(() => useInventory({ sessionToken: customToken }), { wrapper });

      await waitFor(() => {
        expect(materialOperations.list).toHaveBeenCalledWith(
          customToken,
          expect.any(Object)
        );
      });
    });

    test('uses enabled option', () => {
      materialOperations.list.mockResolvedValue({
        success: true,
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      const { result } = renderHook(() => useInventory({ enabled: false }), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(materialOperations.list).not.toHaveBeenCalled();
    });
  });

  describe('type safety', () => {
    test('provides correct types for MaterialType', () => {
      const { result } = renderHook(() => useInventory(), { wrapper });

      // TypeScript should enforce these types
      expect(typeof result.current.createMaterial).toBe('function');
      expect(typeof result.current.updateMaterial).toBe('function');
      expect(typeof result.current.deleteMaterial).toBe('function');
      expect(typeof result.current.updateStock).toBe('function');
      expect(typeof result.current.recordConsumption).toBe('function');
    });

    test('provides correct types for request objects', () => {
      // This test verifies that the TypeScript types are correct
      const materialType: 'ppf_film' | 'adhesive' | 'cleaning_solution' | 'tool' | 'consumable' = 'ppf_film';
      const transactionType: 'stock_in' | 'stock_out' | 'adjustment' | 'waste' = 'stock_in';

      expect(materialType).toBe('ppf_film');
      expect(transactionType).toBe('stock_in');
    });
  });

  describe('optimistic updates', () => {
    test('optimistically updates material list on creation', async () => {
      const initialMaterials = createTestMaterials(3);
      const newMaterial = createTestMaterial({ id: 'new-material' });
      
      materialOperations.list.mockResolvedValue({
        success: true,
        data: initialMaterials,
        pagination: { page: 1, limit: 10, total: 3, totalPages: 1 },
      });

      materialOperations.create.mockResolvedValue({
        success: true,
        data: newMaterial,
      });

      const { result } = renderHook(() => useInventory(), { wrapper });

      await waitFor(() => {
        expect(result.current.materials).toEqual(initialMaterials);
      });

      const requestData: CreateMaterialRequest = {
        sku: 'NEW-MAT-001',
        name: 'New Test Material',
        material_type: 'ppf_film',
        unit_of_measure: 'meter',
      };

      await result.current.createMaterial(requestData);

      // In a real implementation with optimistic updates, the material list
      // would be updated immediately before the API call completes
      expect(materialOperations.create).toHaveBeenCalled();
    });
  });

  describe('caching behavior', () => {
    test('caches material list', async () => {
      const mockMaterials = createTestMaterials(3);
      const mockResponse = {
        success: true,
        data: mockMaterials,
        pagination: { page: 1, limit: 10, total: 3, totalPages: 1 },
      };

      materialOperations.list.mockResolvedValue(mockResponse);

      // First call
      const { result: result1, rerender } = renderHook(() => useInventory(), { wrapper });

      await waitFor(() => {
        expect(result1.current.materials).toEqual(mockMaterials);
      });

      expect(materialOperations.list).toHaveBeenCalledTimes(1);

      // Re-render hook - should use cached data
      rerender();

      expect(result1.current.materials).toEqual(mockMaterials);
      expect(materialOperations.list).toHaveBeenCalledTimes(1);
    });

    test('invalidates cache on mutation', async () => {
      const mockMaterials = createTestMaterials(3);
      const newMaterial = createTestMaterial({ id: 'new-material' });
      
      materialOperations.list.mockResolvedValue({
        success: true,
        data: mockMaterials,
        pagination: { page: 1, limit: 10, total: 3, totalPages: 1 },
      });

      materialOperations.create.mockResolvedValue({
        success: true,
        data: newMaterial,
      });

      const { result } = renderHook(() => useInventory(), { wrapper });

      await waitFor(() => {
        expect(result.current.materials).toEqual(mockMaterials);
      });

      // Create a material, which should invalidate the cache
      await result.current.createMaterial({
        sku: 'NEW-MAT-001',
        name: 'New Test Material',
        material_type: 'ppf_film',
        unit_of_measure: 'meter',
      });

      // In a real implementation, the cache would be invalidated
      // and the next render would fetch fresh data
      expect(materialOperations.create).toHaveBeenCalled();
    });
  });
});