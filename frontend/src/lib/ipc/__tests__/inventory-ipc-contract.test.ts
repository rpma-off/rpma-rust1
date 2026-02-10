import { ipcClient } from '../client';

jest.mock('../utils', () => ({
  safeInvoke: jest.fn(),
}));

jest.mock('../cache', () => ({
  cachedInvoke: jest.fn(),
  invalidatePattern: jest.fn(),
  getCacheStats: jest.fn(),
  invalidateKey: jest.fn(),
  clearCache: jest.fn(),
}));

const { safeInvoke } = jest.requireMock('../utils') as {
  safeInvoke: jest.Mock;
};

const { cachedInvoke, invalidatePattern } = jest.requireMock('../cache') as {
  cachedInvoke: jest.Mock;
  invalidatePattern: jest.Mock;
};

describe('ipcClient.material IPC argument shapes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    safeInvoke.mockResolvedValue('ok');
    cachedInvoke.mockResolvedValue({
      materials: [],
      stats: {
        total_materials: 0,
        total_value: 0,
        low_stock_count: 0,
      },
    });
  });

  // Material CRUD Operations
  describe('Material CRUD operations', () => {
    it('uses top-level sessionToken for material_list', async () => {
      await ipcClient.material.list('token-a', {
        page: 1,
        limit: 20,
        search: 'test',
        material_type: 'ppf_film',
        category: 'films',
      });

      expect(safeInvoke).toHaveBeenCalledWith('material_list', {
        sessionToken: 'token-a',
        page: 1,
        limit: 20,
        search: 'test',
        material_type: 'ppf_film',
        category: 'films',
      });
    });

    it('uses nested request.session_token for material_create', async () => {
      await ipcClient.material.create(
        {
          sku: 'TEST-PPF-001',
          name: 'Test PPF Film',
          description: 'Test description',
          material_type: 'ppf_film',
          unit_of_measure: 'meter',
          minimum_stock: 20,
          maximum_stock: 500,
        },
        'token-b'
      );

      expect(safeInvoke).toHaveBeenCalledWith('material_create', {
        request: {
          sku: 'TEST-PPF-001',
          name: 'Test PPF Film',
          description: 'Test description',
          material_type: 'ppf_film',
          unit_of_measure: 'meter',
          minimum_stock: 20,
          maximum_stock: 500,
          session_token: 'token-b',
        },
      });
    });

    it('uses nested request.session_token for material_update', async () => {
      await ipcClient.material.update(
        'material-123',
        {
          name: 'Updated Material Name',
          minimum_stock: 25,
        },
        'token-c'
      );

      expect(safeInvoke).toHaveBeenCalledWith('material_update', {
        id: 'material-123',
        request: {
          name: 'Updated Material Name',
          minimum_stock: 25,
          session_token: 'token-c',
        },
      });
    });

    it('uses top-level sessionToken for material_get', async () => {
      await ipcClient.material.get('material-123', 'token-d');

      expect(safeInvoke).toHaveBeenCalledWith('material_get', {
        sessionToken: 'token-d',
        id: 'material-123',
      });
    });

    it('uses top-level sessionToken for material_delete', async () => {
      await ipcClient.material.delete('material-123', 'token-e');

      expect(safeInvoke).toHaveBeenCalledWith('material_delete', {
        sessionToken: 'token-e',
        id: 'material-123',
      });
    });
  });

  // Stock Management Operations
  describe('Stock Management operations', () => {
    it('uses nested request.session_token for update_stock', async () => {
      await ipcClient.material.updateStock(
        {
          material_id: 'material-123',
          quantity_change: 50,
          reason: 'Purchase order',
        },
        'token-f'
      );

      expect(safeInvoke).toHaveBeenCalledWith('material_update_stock', {
        request: {
          material_id: 'material-123',
          quantity_change: 50,
          reason: 'Purchase order',
          session_token: 'token-f',
        },
      });
    });

    it('uses nested request.session_token for adjust_stock', async () => {
      await ipcClient.material.adjustStock(
        {
          material_id: 'material-123',
          quantity_change: -5,
          reason: 'Physical count adjustment',
        },
        'token-g'
      );

      expect(safeInvoke).toHaveBeenCalledWith('material_adjust_stock', {
        request: {
          material_id: 'material-123',
          quantity_change: -5,
          reason: 'Physical count adjustment',
          session_token: 'token-g',
        },
      });
    });
  });

  // Consumption Tracking Operations
  describe('Consumption Tracking operations', () => {
    it('uses nested request.session_token for record_consumption', async () => {
      await ipcClient.material.recordConsumption(
        {
          intervention_id: 'intervention-123',
          material_id: 'material-123',
          quantity_used: 15,
          waste_quantity: 2,
          step_id: 'step-123',
        },
        'token-h'
      );

      expect(safeInvoke).toHaveBeenCalledWith('material_record_consumption', {
        request: {
          intervention_id: 'intervention-123',
          material_id: 'material-123',
          quantity_used: 15,
          waste_quantity: 2,
          step_id: 'step-123',
          session_token: 'token-h',
        },
      });
    });

    it('uses top-level sessionToken for get_consumption_history', async () => {
      await ipcClient.material.getConsumptionHistory('material-123', 'token-i', {
        page: 1,
        limit: 50,
      });

      expect(safeInvoke).toHaveBeenCalledWith('material_get_consumption_history', {
        sessionToken: 'token-i',
        material_id: 'material-123',
        page: 1,
        limit: 50,
      });
    });
  });

  // Inventory Transaction Operations
  describe('Inventory Transaction operations', () => {
    it('uses nested request.session_token for create_inventory_transaction', async () => {
      await ipcClient.material.createInventoryTransaction(
        {
          material_id: 'material-123',
          transaction_type: 'stock_in',
          quantity: 100,
          reference_number: 'PO-001',
          reference_type: 'Purchase Order',
        },
        'token-j'
      );

      expect(safeInvoke).toHaveBeenCalledWith('material_create_inventory_transaction', {
        request: {
          material_id: 'material-123',
          transaction_type: 'stock_in',
          quantity: 100,
          reference_number: 'PO-001',
          reference_type: 'Purchase Order',
          session_token: 'token-j',
        },
      });
    });

    it('uses top-level sessionToken for get_transaction_history', async () => {
      await ipcClient.material.getTransactionHistory('material-123', 'token-k', {
        page: 1,
        limit: 50,
      });

      expect(safeInvoke).toHaveBeenCalledWith('material_get_transaction_history', {
        sessionToken: 'token-k',
        material_id: 'material-123',
        page: 1,
        limit: 50,
      });
    });
  });

  // Material Categories Operations
  describe('Material Categories operations', () => {
    it('uses nested request.session_token for create_material_category', async () => {
      await ipcClient.material.createCategory(
        {
          name: 'Test Category',
          code: 'TEST-CAT',
          description: 'Test category description',
        },
        'token-l'
      );

      expect(safeInvoke).toHaveBeenCalledWith('material_create_category', {
        request: {
          name: 'Test Category',
          code: 'TEST-CAT',
          description: 'Test category description',
          session_token: 'token-l',
        },
      });
    });

    it('uses top-level sessionToken for list_material_categories', async () => {
      await ipcClient.material.listCategories('token-m');

      expect(safeInvoke).toHaveBeenCalledWith('material_list_categories', {
        sessionToken: 'token-m',
      });
    });
  });

  // Supplier Operations
  describe('Supplier operations', () => {
    it('uses nested request.session_token for create_supplier', async () => {
      await ipcClient.material.createSupplier(
        {
          name: 'Test Supplier',
          code: 'SUP-001',
          email: 'supplier@example.com',
          phone: '555-1234',
        },
        'token-n'
      );

      expect(safeInvoke).toHaveBeenCalledWith('material_create_supplier', {
        request: {
          name: 'Test Supplier',
          code: 'SUP-001',
          email: 'supplier@example.com',
          phone: '555-1234',
          session_token: 'token-n',
        },
      });
    });

    it('uses top-level sessionToken for list_suppliers', async () => {
      await ipcClient.material.listSuppliers('token-o');

      expect(safeInvoke).toHaveBeenCalledWith('material_list_suppliers', {
        sessionToken: 'token-o',
      });
    });
  });

  // Reporting and Statistics
  describe('Reporting and Statistics operations', () => {
    it('uses top-level sessionToken for get_material_stats', async () => {
      await ipcClient.material.getStats('token-p');

      expect(safeInvoke).toHaveBeenCalledWith('material_get_stats', {
        sessionToken: 'token-p',
      });
    });

    it('uses top-level sessionToken for get_low_stock_materials', async () => {
      await ipcClient.material.getLowStockMaterials('token-q');

      expect(safeInvoke).toHaveBeenCalledWith('material_get_low_stock_materials', {
        sessionToken: 'token-q',
      });
    });

    it('uses top-level sessionToken for get_expired_materials', async () => {
      await ipcClient.material.getExpiredMaterials('token-r');

      expect(safeInvoke).toHaveBeenCalledWith('material_get_expired_materials', {
        sessionToken: 'token-r',
      });
    });

    it('uses top-level sessionToken for get_inventory_movement_summary', async () => {
      await ipcClient.material.getInventoryMovementSummary('material-123', 'token-s');

      expect(safeInvoke).toHaveBeenCalledWith('material_get_inventory_movement_summary', {
        sessionToken: 'token-s',
        material_id: 'material-123',
      });
    });
  });

  // Cache Invalidation Tests
  describe('Cache invalidation', () => {
    it('invalidates cache patterns for update_stock', async () => {
      await ipcClient.material.updateStock(
        {
          material_id: 'material-123',
          quantity_change: 50,
          reason: 'Purchase order',
        },
        'token-f'
      );

      expect(invalidatePattern).toHaveBeenCalledWith('materials:*');
      expect(invalidatePattern).toHaveBeenCalledWith('material:*');
    });

    it('invalidates cache patterns for material_update', async () => {
      await ipcClient.material.update(
        'material-123',
        {
          name: 'Updated Material Name',
          minimum_stock: 25,
        },
        'token-c'
      );

      expect(invalidatePattern).toHaveBeenCalledWith('materials:*');
      expect(invalidatePattern).toHaveBeenCalledWith('material:*');
    });

    it('invalidates cache patterns for material_delete', async () => {
      await ipcClient.material.delete('material-123', 'token-e');

      expect(invalidatePattern).toHaveBeenCalledWith('materials:*');
      expect(invalidatePattern).toHaveBeenCalledWith('material:*');
    });

    it('invalidates cache patterns for record_consumption', async () => {
      await ipcClient.material.recordConsumption(
        {
          intervention_id: 'intervention-123',
          material_id: 'material-123',
          quantity_used: 15,
        },
        'token-h'
      );

      expect(invalidatePattern).toHaveBeenCalledWith('materials:*');
      expect(invalidatePattern).toHaveBeenCalledWith('material:*');
    });

    it('invalidates cache patterns for create_inventory_transaction', async () => {
      await ipcClient.material.createInventoryTransaction(
        {
          material_id: 'material-123',
          transaction_type: 'stock_in',
          quantity: 100,
        },
        'token-j'
      );

      expect(invalidatePattern).toHaveBeenCalledWith('materials:*');
      expect(invalidatePattern).toHaveBeenCalledWith('material:*');
    });
  });

  // Response Shape Tests
  describe('Response shape validation', () => {
    it('returns expected shape for material_list', async () => {
      const mockResponse = {
        success: true,
        data: {
          materials: [
            {
              id: 'material-123',
              sku: 'TEST-PPF-001',
              name: 'Test PPF Film',
              material_type: 'ppf_film',
              unit_of_measure: 'meter',
              current_stock: 50,
              minimum_stock: 20,
              maximum_stock: 500,
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            has_next: false,
            has_prev: false,
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.material.list('token-a');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('materials');
      expect(result.data).toHaveProperty('pagination');
      expect(Array.isArray(result.data.materials)).toBe(true);
      expect(result.data.materials[0]).toHaveProperty('id');
      expect(result.data.materials[0]).toHaveProperty('sku');
      expect(result.data.materials[0]).toHaveProperty('name');
    });

    it('returns expected shape for material_get', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'material-123',
          sku: 'TEST-PPF-001',
          name: 'Test PPF Film',
          description: 'Test description',
          material_type: 'ppf_film',
          unit_of_measure: 'meter',
          current_stock: 50,
          minimum_stock: 20,
          maximum_stock: 500,
          created_at: '2025-02-09T10:00:00Z',
          updated_at: '2025-02-09T10:00:00Z',
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.material.get('material-123', 'token-d');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('sku');
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('material_type');
      expect(result.data).toHaveProperty('current_stock');
    });

    it('returns expected shape for get_material_stats', async () => {
      const mockResponse = {
        success: true,
        data: {
          total_materials: 10,
          total_value: 1550.50,
          low_stock_count: 2,
          expired_count: 1,
          material_types: {
            ppf_film: 5,
            adhesive: 3,
            tool: 2,
          },
          categories: {
            films: 5,
            adhesives: 3,
            tools: 2,
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.material.getStats('token-p');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('total_materials');
      expect(result.data).toHaveProperty('total_value');
      expect(result.data).toHaveProperty('low_stock_count');
      expect(result.data).toHaveProperty('expired_count');
      expect(result.data).toHaveProperty('material_types');
      expect(result.data).toHaveProperty('categories');
    });

    it('returns expected shape for get_consumption_history', async () => {
      const mockResponse = {
        success: true,
        data: {
          consumptions: [
            {
              id: 'consumption-123',
              material_id: 'material-123',
              intervention_id: 'intervention-123',
              quantity_used: 15,
              waste_quantity: 2,
              recorded_at: '2025-02-09T10:00:00Z',
              recorded_by: 'tech-001',
            },
          ],
          pagination: {
            page: 1,
            limit: 50,
            total: 1,
            has_next: false,
            has_prev: false,
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.material.getConsumptionHistory('material-123', 'token-i');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('consumptions');
      expect(result.data).toHaveProperty('pagination');
      expect(Array.isArray(result.data.consumptions)).toBe(true);
      expect(result.data.consumptions[0]).toHaveProperty('id');
      expect(result.data.consumptions[0]).toHaveProperty('material_id');
      expect(result.data.consumptions[0]).toHaveProperty('quantity_used');
    });
  });

  // Error Response Tests
  describe('Error response handling', () => {
    it('handles validation errors for material_create', async () => {
      const mockResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'SKU is required',
          details: {
            field: 'sku',
            value: '',
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.material.create(
        {
          name: 'Test Material',
          material_type: 'ppf_film',
        },
        'token-b'
      );

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(result.error).toHaveProperty('message');
    });

    it('handles not found errors for material_get', async () => {
      const mockResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Material not found',
          details: {
            material_id: 'non-existent-material',
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.material.get('non-existent-material', 'token-d');

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('handles insufficient stock errors for update_stock', async () => {
      const mockResponse = {
        success: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: 'Insufficient stock available',
          details: {
            material_id: 'material-123',
            requested_quantity: 100,
            available_quantity: 50,
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.material.updateStock(
        {
          material_id: 'material-123',
          quantity_change: -100,
          reason: 'Test withdrawal',
        },
        'token-f'
      );

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toHaveProperty('code', 'INSUFFICIENT_STOCK');
    });
  });
});