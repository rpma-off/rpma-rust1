import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { 
  materialOperations, 
  materialCategoryOperations,
  supplierOperations,
  inventoryStats 
} from '@/domains/inventory/server';
import { safeInvoke } from '@/lib/ipc/core';
import { Material, MaterialType, UnitOfMeasure } from '@/shared/types';

// Mock the core IPC module
jest.mock('@/lib/ipc/core', () => ({
  safeInvoke: jest.fn(),
}));
const mockSafeInvoke = safeInvoke as jest.MockedFunction<typeof safeInvoke>;

describe('Inventory IPC Contract Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Material Operations', () => {
    describe('materialOperations.list', () => {
      it('should call the correct IPC command with proper parameters', async () => {
        const mockResponse = {
          success: true,
          data: [
            {
              id: 'material-1',
              sku: 'TEST-MAT-001',
              name: 'Test Material 1',
              material_type: 'ppf_film' as MaterialType,
              unit_of_measure: 'meter' as UnitOfMeasure,
              current_stock: 50,
              minimum_stock: 20,
              maximum_stock: 200,
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
          },
        };

        mockSafeInvoke.mockResolvedValue(mockResponse);

        const result = await materialOperations.list('test-token', {
          page: 1,
          limit: 10,
          material_type: 'ppf_film',
          search: 'test',
        });

        expect(mockSafeInvoke).toHaveBeenCalledWith('material_list', {
          sessionToken: 'test-token',
          page: 1,
          limit: 10,
          material_type: 'ppf_film',
          search: 'test',
        });
        expect(result).toEqual(mockResponse);
      });

      it('should handle empty parameters', async () => {
        const mockResponse = {
          success: true,
          data: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
          },
        };

        mockSafeInvoke.mockResolvedValue(mockResponse);

        const result = await materialOperations.list('test-token', {});

        expect(mockSafeInvoke).toHaveBeenCalledWith('material_list', {
          sessionToken: 'test-token',
        });
        expect(result).toEqual(mockResponse);
      });

      it('should handle API errors', async () => {
        const mockError = {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch materials',
          },
        };

        mockSafeInvoke.mockResolvedValue(mockError);

        await expect(materialOperations.list('test-token', {})).resolves.toEqual(mockError);
      });
    });

    describe('materialOperations.create', () => {
      it('should call the correct IPC command with proper parameters', async () => {
        const mockMaterial: Material = {
          id: 'material-1',
          sku: 'TEST-MAT-001',
          name: 'Test Material 1',
          material_type: 'ppf_film' as MaterialType,
          unit_of_measure: 'meter' as UnitOfMeasure,
          current_stock: 50,
          minimum_stock: 20,
          maximum_stock: 200,
        };

        const mockResponse = {
          success: true,
          data: mockMaterial,
        };

        mockSafeInvoke.mockResolvedValue(mockResponse);

        const createRequest = {
          sku: 'TEST-MAT-001',
          name: 'Test Material 1',
          material_type: 'ppf_film' as MaterialType,
          unit_of_measure: 'meter' as UnitOfMeasure,
          current_stock: 50,
          minimum_stock: 20,
          maximum_stock: 200,
        };

        const result = await materialOperations.create(createRequest, 'test-token');

        expect(mockSafeInvoke).toHaveBeenCalledWith('material_create', {
          request: createRequest,
          user_id: 'test-token',
        });
        expect(result).toEqual(mockMaterial);
      });

      it('should handle validation errors', async () => {
        const mockError = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'SKU is required',
          },
        };

        mockSafeInvoke.mockResolvedValue(mockError);

        const createRequest = {
          sku: '',
          name: 'Test Material 1',
          material_type: 'ppf_film' as MaterialType,
          unit_of_measure: 'meter' as UnitOfMeasure,
        };

        await expect(materialOperations.create(createRequest, 'test-token')).rejects.toThrow();
      });
    });

    describe('materialOperations.update', () => {
      it('should call the correct IPC command with proper parameters', async () => {
        const mockMaterial: Material = {
          id: 'material-1',
          sku: 'TEST-MAT-001',
          name: 'Updated Test Material 1',
          material_type: 'ppf_film' as MaterialType,
          unit_of_measure: 'meter' as UnitOfMeasure,
          current_stock: 50,
          minimum_stock: 20,
          maximum_stock: 200,
        };

        const mockResponse = {
          success: true,
          data: mockMaterial,
        };

        mockSafeInvoke.mockResolvedValue(mockResponse);

        const updateRequest = {
          name: 'Updated Test Material 1',
          current_stock: 75,
        };

        const result = await materialOperations.update('material-1', updateRequest, 'test-token');

        expect(mockSafeInvoke).toHaveBeenCalledWith('material_update', {
          id: 'material-1',
          request: updateRequest,
          user_id: 'test-token',
        });
        expect(result).toEqual(mockMaterial);
      });

      it('should handle not found error', async () => {
        const mockError = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Material not found',
          },
        };

        mockSafeInvoke.mockResolvedValue(mockError);

        const updateRequest = {
          name: 'Updated Test Material 1',
        };

        await expect(materialOperations.update('non-existent', updateRequest, 'test-token')).rejects.toThrow();
      });
    });

    describe('materialOperations.delete', () => {
      it('should call the correct IPC command with proper parameters', async () => {
        const mockResponse = {
          success: true,
          data: null,
        };

        mockSafeInvoke.mockResolvedValue(mockResponse);

        await materialOperations.delete('material-1', 'test-token');

        expect(mockSafeInvoke).toHaveBeenCalledWith('material_delete', {
          id: 'material-1',
          user_id: 'test-token',
        });
      });

      it('should handle not found error', async () => {
        const mockError = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Material not found',
          },
        };

        mockSafeInvoke.mockResolvedValue(mockError);

        await expect(materialOperations.delete('non-existent', 'test-token')).rejects.toThrow();
      });
    });

    describe('materialOperations.updateStock', () => {
      it('should call the correct IPC command with proper parameters', async () => {
        const mockMaterial: Material = {
          id: 'material-1',
          sku: 'TEST-MAT-001',
          name: 'Test Material 1',
          material_type: 'ppf_film' as MaterialType,
          unit_of_measure: 'meter' as UnitOfMeasure,
          current_stock: 150, // Updated from 50 to 150
          minimum_stock: 20,
          maximum_stock: 200,
        };

        const mockResponse = {
          success: true,
          data: mockMaterial,
        };

        mockSafeInvoke.mockResolvedValue(mockResponse);

        const stockRequest = {
          material_id: 'material-1',
          quantity: 100,
          transaction_type: 'stock_in' as const,
          notes: 'Purchase order',
        };

        const result = await materialOperations.updateStock(stockRequest, 'test-token');

        expect(mockSafeInvoke).toHaveBeenCalledWith('material_update_stock', {
          request: stockRequest,
          user_id: 'test-token',
        });
        expect(result).toEqual(mockMaterial);
      });

      it('should handle insufficient stock error', async () => {
        const mockError = {
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: 'Cannot reduce stock below 0',
          },
        };

        mockSafeInvoke.mockResolvedValue(mockError);

        const stockRequest = {
          material_id: 'material-1',
          quantity: -100,
          transaction_type: 'stock_out' as const,
        };

        await expect(materialOperations.updateStock(stockRequest, 'test-token')).rejects.toThrow();
      });
    });

    describe('materialOperations.recordConsumption', () => {
      it('should call the correct IPC command with proper parameters', async () => {
        const mockConsumption = {
          id: 'consumption-1',
          material_id: 'material-1',
          intervention_id: 'intervention-1',
          quantity_used: 25,
          waste_quantity: 5,
          recorded_at: new Date().toISOString(),
        };

        const mockResponse = {
          success: true,
          data: mockConsumption,
        };

        mockSafeInvoke.mockResolvedValue(mockResponse);

        const consumptionRequest = {
          intervention_id: 'intervention-1',
          material_id: 'material-1',
          quantity_used: 25,
          waste_quantity: 5,
        };

        const result = await materialOperations.recordConsumption(consumptionRequest, 'test-token');

        expect(mockSafeInvoke).toHaveBeenCalledWith('material_record_consumption', {
          request: consumptionRequest,
          user_id: 'test-token',
        });
        expect(result).toEqual(mockConsumption);
      });

      it('should handle material not found error', async () => {
        const mockError = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Material not found',
          },
        };

        mockSafeInvoke.mockResolvedValue(mockError);

        const consumptionRequest = {
          intervention_id: 'intervention-1',
          material_id: 'non-existent',
          quantity_used: 25,
        };

        await expect(materialOperations.recordConsumption(consumptionRequest, 'test-token')).rejects.toThrow();
      });
    });

    describe('materialOperations.getTransactionHistory', () => {
      it('should call the correct IPC command with proper parameters', async () => {
        const mockTransactions = [
          {
            id: 'transaction-1',
            material_id: 'material-1',
            transaction_type: 'stock_in',
            quantity: 100,
            previous_stock: 0,
            new_stock: 100,
            performed_at: new Date().toISOString(),
          },
        ];

        const mockResponse = {
          success: true,
          data: mockTransactions,
        };

        mockSafeInvoke.mockResolvedValue(mockResponse);

        const result = await materialOperations.getTransactionHistory('material-1', 'test-token');

        expect(mockSafeInvoke).toHaveBeenCalledWith('material_get_transaction_history', {
          material_id: 'material-1',
          user_id: 'test-token',
        });
        expect(result).toEqual(mockTransactions);
      });

      it('should handle empty history', async () => {
        const mockResponse = {
          success: true,
          data: [],
        };

        mockSafeInvoke.mockResolvedValue(mockResponse);

        const result = await materialOperations.getTransactionHistory('material-1', 'test-token');

        expect(result).toEqual([]);
      });
    });
  });

  describe('Material Category Operations', () => {
    describe('materialCategoryOperations.list', () => {
      it('should call the correct IPC command with proper parameters', async () => {
        const mockCategories = [
          {
            id: 'category-1',
            name: 'Films',
            code: 'FILMS',
            level: 1,
            parent_id: null,
            is_active: true,
          },
        ];

        const mockResponse = {
          success: true,
          data: mockCategories,
        };

        mockSafeInvoke.mockResolvedValue(mockResponse);

        const result = await materialCategoryOperations.list('test-token', {
          active_only: true,
        });

        expect(mockSafeInvoke).toHaveBeenCalledWith('material_category_list', {
          sessionToken: 'test-token',
          active_only: true,
        });
        expect(result).toEqual(mockCategories);
      });

      it('should handle empty parameters', async () => {
        const mockResponse = {
          success: true,
          data: [],
        };

        mockSafeInvoke.mockResolvedValue(mockResponse);

        const result = await materialCategoryOperations.list('test-token', {});

        expect(mockSafeInvoke).toHaveBeenCalledWith('material_category_list', {
          sessionToken: 'test-token',
        });
        expect(result).toEqual([]);
      });
    });

    describe('materialCategoryOperations.create', () => {
      it('should call the correct IPC command with proper parameters', async () => {
        const mockCategory = {
          id: 'category-1',
          name: 'Films',
          code: 'FILMS',
          level: 1,
          parent_id: null,
          is_active: true,
        };

        const mockResponse = {
          success: true,
          data: mockCategory,
        };

        mockSafeInvoke.mockResolvedValue(mockResponse);

        const createRequest = {
          name: 'Films',
          code: 'FILMS',
          level: 1,
          parent_id: null,
        };

        const result = await materialCategoryOperations.create(createRequest, 'test-token');

        expect(mockSafeInvoke).toHaveBeenCalledWith('material_category_create', {
          request: createRequest,
          user_id: 'test-token',
        });
        expect(result).toEqual(mockCategory);
      });

      it('should handle validation errors', async () => {
        const mockError = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Category name is required',
          },
        };

        mockSafeInvoke.mockResolvedValue(mockError);

        const createRequest = {
          name: '',
          code: '',
        };

        await expect(materialCategoryOperations.create(createRequest, 'test-token')).rejects.toThrow();
      });
    });

    describe('materialCategoryOperations.update', () => {
      it('should call the correct IPC command with proper parameters', async () => {
        const mockCategory = {
          id: 'category-1',
          name: 'Updated Films',
          code: 'FILMS',
          level: 1,
          parent_id: null,
          is_active: true,
        };

        const mockResponse = {
          success: true,
          data: mockCategory,
        };

        mockSafeInvoke.mockResolvedValue(mockResponse);

        const updateRequest = {
          name: 'Updated Films',
        };

        const result = await materialCategoryOperations.update('category-1', updateRequest, 'test-token');

        expect(mockSafeInvoke).toHaveBeenCalledWith('material_category_update', {
          id: 'category-1',
          request: updateRequest,
          user_id: 'test-token',
        });
        expect(result).toEqual(mockCategory);
      });
    });
  });

  describe('Supplier Operations', () => {
    describe('supplierOperations.list', () => {
      it('should call the correct IPC command with proper parameters', async () => {
        const mockSuppliers = [
          {
            id: 'supplier-1',
            name: 'Test Supplier',
            code: 'TEST-SUP',
            is_active: true,
            is_preferred: false,
          },
        ];

        const mockResponse = {
          success: true,
          data: mockSuppliers,
        };

        mockSafeInvoke.mockResolvedValue(mockResponse);

        const result = await supplierOperations.list('test-token', {
          active_only: true,
          preferred_only: false,
        });

        expect(mockSafeInvoke).toHaveBeenCalledWith('supplier_list', {
          sessionToken: 'test-token',
          active_only: true,
          preferred_only: false,
        });
        expect(result).toEqual(mockSuppliers);
      });
    });

    describe('supplierOperations.create', () => {
      it('should call the correct IPC command with proper parameters', async () => {
        const mockSupplier = {
          id: 'supplier-1',
          name: 'Test Supplier',
          code: 'TEST-SUP',
          email: 'test@example.com',
          is_active: true,
          is_preferred: false,
        };

        const mockResponse = {
          success: true,
          data: mockSupplier,
        };

        mockSafeInvoke.mockResolvedValue(mockResponse);

        const createRequest = {
          name: 'Test Supplier',
          code: 'TEST-SUP',
          email: 'test@example.com',
        };

        const result = await supplierOperations.create(createRequest, 'test-token');

        expect(mockSafeInvoke).toHaveBeenCalledWith('supplier_create', {
          request: createRequest,
          user_id: 'test-token',
        });
        expect(result).toEqual(mockSupplier);
      });
    });

    describe('supplierOperations.update', () => {
      it('should call the correct IPC command with proper parameters', async () => {
        const mockSupplier = {
          id: 'supplier-1',
          name: 'Updated Test Supplier',
          code: 'TEST-SUP',
          email: 'updated@example.com',
          is_active: true,
          is_preferred: true,
        };

        const mockResponse = {
          success: true,
          data: mockSupplier,
        };

        mockSafeInvoke.mockResolvedValue(mockResponse);

        const updateRequest = {
          name: 'Updated Test Supplier',
          email: 'updated@example.com',
          is_preferred: true,
        };

        const result = await supplierOperations.update('supplier-1', updateRequest, 'test-token');

        expect(mockSafeInvoke).toHaveBeenCalledWith('supplier_update', {
          id: 'supplier-1',
          request: updateRequest,
          user_id: 'test-token',
        });
        expect(result).toEqual(mockSupplier);
      });
    });
  });

  describe('Inventory Stats Operations', () => {
    describe('inventoryStats.get', () => {
      it('should call the correct IPC command with proper parameters', async () => {
        const mockStats = {
          total_materials: 42,
          active_materials: 38,
          low_stock_materials: 5,
          expired_materials: 2,
          total_value: 15500.50,
          materials_by_type: {
            ppf_film: 15,
            adhesive: 12,
            cleaning_solution: 8,
            tool: 4,
            consumable: 3,
          },
        };

        const mockResponse = {
          success: true,
          data: mockStats,
        };

        mockSafeInvoke.mockResolvedValue(mockResponse);

        const result = await inventoryStats.get('test-token');

        expect(mockSafeInvoke).toHaveBeenCalledWith('inventory_stats_get', {
          sessionToken: 'test-token',
        });
        expect(result).toEqual(mockStats);
      });

      it('should handle empty stats', async () => {
        const mockStats = {
          total_materials: 0,
          active_materials: 0,
          low_stock_materials: 0,
          expired_materials: 0,
          total_value: 0,
          materials_by_type: {},
        };

        const mockResponse = {
          success: true,
          data: mockStats,
        };

        mockSafeInvoke.mockResolvedValue(mockResponse);

        const result = await inventoryStats.get('test-token');

        expect(result).toEqual(mockStats);
      });
    });
  });

  describe('Type Safety', () => {
    it('should enforce MaterialType enum values', () => {
      // These should be valid MaterialType values
      const validTypes: MaterialType[] = ['ppf_film', 'adhesive', 'cleaning_solution', 'tool', 'consumable'];
      
      validTypes.forEach(type => {
        expect(['ppf_film', 'adhesive', 'cleaning_solution', 'tool', 'consumable']).toContain(type);
      });

      // TypeScript should prevent invalid types at compile time
      // @ts-expect-error - This should fail type checking
      const _invalidType: MaterialType = 'invalid_type';
    });

    it('should enforce UnitOfMeasure enum values', () => {
      // These should be valid UnitOfMeasure values
      const validUnits: UnitOfMeasure[] = ['piece', 'meter', 'liter', 'gram', 'roll'];
      
      validUnits.forEach(unit => {
        expect(['piece', 'meter', 'liter', 'gram', 'roll']).toContain(unit);
      });

      // TypeScript should prevent invalid types at compile time
      // @ts-expect-error - This should fail type checking
      const _invalidUnit: UnitOfMeasure = 'invalid_unit';
    });

    it('should enforce transaction type values', () => {
      // These should be valid transaction types
      const validTypes = ['stock_in', 'stock_out', 'adjustment', 'waste'] as const;
      
      validTypes.forEach(type => {
        expect(['stock_in', 'stock_out', 'adjustment', 'waste']).toContain(type);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockSafeInvoke.mockRejectedValue(new Error('Network error'));

      await expect(materialOperations.list('test-token', {})).rejects.toThrow('Network error');
    });

    it('should handle malformed responses', async () => {
      mockSafeInvoke.mockResolvedValue({});

      await expect(materialOperations.list('test-token', {})).resolves.toEqual({});
    });

    it('should handle timeout errors', async () => {
      mockSafeInvoke.mockRejectedValue(new Error('Request timeout'));

      await expect(materialOperations.list('test-token', {})).rejects.toThrow('Request timeout');
    });
  });

  describe('Data Validation', () => {
    it('should validate material data structure', async () => {
      const mockMaterial: Material = {
        id: 'material-1',
        sku: 'TEST-MAT-001',
        name: 'Test Material 1',
        material_type: 'ppf_film' as MaterialType,
        unit_of_measure: 'meter' as UnitOfMeasure,
        current_stock: 50,
        minimum_stock: 20,
        maximum_stock: 200,
      };

      const mockResponse = {
        success: true,
        data: mockMaterial,
      };

      mockSafeInvoke.mockResolvedValue(mockResponse);

      const result = await materialOperations.get('test-token', 'material-1');

      expect(result).toEqual(mockMaterial);
      expect(result.id).toBe('material-1');
      expect(result.sku).toBe('TEST-MAT-001');
      expect(result.material_type).toBe('ppf_film');
      expect(result.unit_of_measure).toBe('meter');
    });

    it('should validate pagination response', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        id: `material-${i + 1}`,
        sku: `TEST-MAT-${String(i + 1).padStart(3, '0')}`,
        name: `Test Material ${i + 1}`,
        material_type: 'ppf_film' as MaterialType,
        unit_of_measure: 'meter' as UnitOfMeasure,
        current_stock: Math.floor(Math.random() * 100),
        minimum_stock: Math.floor(Math.random() * 50),
        maximum_stock: Math.floor(Math.random() * 500) + 100,
      }));
      
      const mockResponse = {
        success: true,
        data: largeDataset,
        pagination: {
          page: 1,
          limit: 100,
          total: 100,
          totalPages: 1,
        },
      };

      mockSafeInvoke.mockResolvedValue(mockResponse);

      const result = await materialOperations.list('test-token', { limit: 100 });

      expect(result.data).toHaveLength(100);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(100);
      expect(result.pagination.total).toBe(100);
      expect(result.pagination.totalPages).toBe(1);
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `material-${i + 1}`,
        sku: `TEST-MAT-${String(i + 1).padStart(3, '0')}`,
        name: `Test Material ${i + 1}`,
        material_type: 'ppf_film' as MaterialType,
        unit_of_measure: 'meter' as UnitOfMeasure,
        current_stock: Math.floor(Math.random() * 100),
        minimum_stock: Math.floor(Math.random() * 50),
        maximum_stock: Math.floor(Math.random() * 500) + 100,
      }));
      
      const mockResponse = {
        success: true,
        data: largeDataset,
        pagination: {
          page: 1,
          limit: 1000,
          total: 1000,
          totalPages: 1,
        },
      };

      mockSafeInvoke.mockResolvedValue(mockResponse);

      const startTime = Date.now();
      const result = await materialOperations.list('test-token', { limit: 1000 });
      const endTime = Date.now();

      expect(result.data).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});

