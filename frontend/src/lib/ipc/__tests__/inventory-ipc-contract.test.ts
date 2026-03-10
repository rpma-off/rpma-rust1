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
        low_stock_count: 0
      }
    });
  });

  // Material CRUD Operations
  describe('Material CRUD operations', () => {
    it('calls material_list without sessionToken in payload', async () => {
      await ipcClient.material.list({
        page: 1,
        limit: 20,
        search: 'test',
        material_type: 'ppf_film',
        category: 'films'
      });

      expect(safeInvoke).toHaveBeenCalledWith('material_list', {
        page: 1,
        limit: 20,
        search: 'test',
        material_type: 'ppf_film',
        category: 'films'
      });
    });

    it('calls material_create without session_token in nested request', async () => {
      await ipcClient.material.create(
        {
          sku: 'TEST-PPF-001',
          name: 'Test PPF Film',
          description: 'Test description',
          material_type: 'ppf_film',
          unit_of_measure: 'meter',
          minimum_stock: 20,
          maximum_stock: 500
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
          maximum_stock: 500
        }
      });
    });

    it('calls material_update without session_token in nested request', async () => {
      await ipcClient.material.update(
        'material-123',
        {
          name: 'Updated Material Name',
          minimum_stock: 25
        },
        'token-c'
      );

      expect(safeInvoke).toHaveBeenCalledWith('material_update', {
        id: 'material-123',
        request: {
          name: 'Updated Material Name',
          minimum_stock: 25
        }
      });
    });

    it('calls material_get without sessionToken in payload', async () => {
      await ipcClient.material.get('material-123');

      expect(safeInvoke).toHaveBeenCalledWith('material_get', {
        id: 'material-123'
      });
    });

    it('calls material_delete without sessionToken in payload', async () => {
      await ipcClient.material.delete('material-123');

      expect(safeInvoke).toHaveBeenCalledWith('material_delete', {
        id: 'material-123'
      });
    });
  });

  // Stock Management Operations
  describe('Stock Management operations', () => {
    it('calls update_stock without session_token in nested request', async () => {
      await ipcClient.material.updateStock(
        {
          material_id: 'material-123',
          quantity_change: 50,
          reason: 'Purchase order'
        },
        'token-f'
      );

      expect(safeInvoke).toHaveBeenCalledWith('material_update_stock', {
        request: {
          material_id: 'material-123',
          quantity_change: 50,
          reason: 'Purchase order'
        }
      });
    });

    it('calls adjust_stock without session_token in nested request', async () => {
      await ipcClient.material.adjustStock(
        {
          material_id: 'material-123',
          quantity_change: -5,
          reason: 'Physical count adjustment'
        },
        'token-g'
      );

      expect(safeInvoke).toHaveBeenCalledWith('material_adjust_stock', {
        request: {
          material_id: 'material-123',
          quantity_change: -5,
          reason: 'Physical count adjustment'
        }
      });
    });
  });

  // Consumption Tracking Operations
  describe('Consumption Tracking operations', () => {
    it('calls record_consumption without session_token in nested request', async () => {
      await ipcClient.material.recordConsumption(
        {
          intervention_id: 'intervention-123',
          material_id: 'material-123',
          quantity_used: 15,
          waste_quantity: 2,
          step_id: 'step-123'
        },
        'token-h'
      );

      expect(safeInvoke).toHaveBeenCalledWith('material_record_consumption', {
        request: {
          intervention_id: 'intervention-123',
          material_id: 'material-123',
          quantity_used: 15,
          waste_quantity: 2,
          step_id: 'step-123'
        }
      });
    });

    it('calls get_consumption_history without sessionToken in payload', async () => {
      await ipcClient.material.getConsumptionHistory('material-123', 'token-i', {
        page: 1,
        limit: 50
      });

      expect(safeInvoke).toHaveBeenCalledWith('material_get_consumption_history', {
        material_id: 'material-123',
        page: 1,
        limit: 50
      });
    });
  });

  // Inventory Transaction Operations
  describe('Inventory Transaction operations', () => {
    it('calls create_inventory_transaction without session_token in nested request', async () => {
      await ipcClient.material.createInventoryTransaction(
        {
          material_id: 'material-123',
          transaction_type: 'stock_in',
          quantity: 100,
          reference_number: 'PO-001',
          reference_type: 'Purchase Order'
        },
        'token-j'
      );

      expect(safeInvoke).toHaveBeenCalledWith('material_create_inventory_transaction', {
        request: {
          material_id: 'material-123',
          transaction_type: 'stock_in',
          quantity: 100,
          reference_number: 'PO-001',
          reference_type: 'Purchase Order'
        }
      });
    });

    it('calls get_transaction_history without sessionToken in payload', async () => {
      await ipcClient.material.getTransactionHistory('material-123', 'token-k', {
        page: 1,
        limit: 50
      });

      expect(safeInvoke).toHaveBeenCalledWith('material_get_transaction_history', {
        material_id: 'material-123',
        page: 1,
        limit: 50
      });
    });
  });

  // Material Categories Operations
  describe('Material Categories operations', () => {
    it('calls create_material_category without session_token in nested request', async () => {
      await ipcClient.material.createCategory(
        {
          name: 'Test Category',
          code: 'TEST-CAT',
          description: 'Test category description'
        },
        'token-l'
      );

      expect(safeInvoke).toHaveBeenCalledWith('material_create_category', {
        request: {
          name: 'Test Category',
          code: 'TEST-CAT',
          description: 'Test category description'
        }
      });
    });

    it('calls list_material_categories without sessionToken in payload', async () => {
      await ipcClient.material.listCategories('token-m');

      expect(safeInvoke).toHaveBeenCalledWith('material_list_categories', {
      });
    });
  });

  // Supplier Operations
  describe('Supplier operations', () => {
    it('calls create_supplier without session_token in nested request', async () => {
      await ipcClient.material.createSupplier(
        {
          name: 'Test Supplier',
          code: 'SUP-001',
          email: 'supplier@example.com',
          phone: '555-1234'
        },
        'token-n'
      );

      expect(safeInvoke).toHaveBeenCalledWith('material_create_supplier', {
        request: {
          name: 'Test Supplier',
          code: 'SUP-001',
          email: 'supplier@example.com',
          phone: '555-1234'
        }
      });
    });

    it('calls list_suppliers without sessionToken in payload', async () => {
      await ipcClient.material.listSuppliers('token-o');

      expect(safeInvoke).toHaveBeenCalledWith('material_list_suppliers', {
      });
    });
  });

  // Reporting and Statistics
  describe('Reporting and Statistics operations', () => {
    it('calls get_material_stats without sessionToken in payload', async () => {
      await ipcClient.material.getStats('token-p');

      expect(safeInvoke).toHaveBeenCalledWith('material_get_stats', {
      });
    });

    it('calls get_low_stock_materials without sessionToken in payload', async () => {
      await ipcClient.material.getLowStockMaterials('token-q');

      expect(safeInvoke).toHaveBeenCalledWith('material_get_low_stock_materials', {
      });
    });

    it('calls get_expired_materials without sessionToken in payload', async () => {
      await ipcClient.material.getExpiredMaterials('token-r');

      expect(safeInvoke).toHaveBeenCalledWith('material_get_expired_materials', {
      });
    });

    it('calls get_inventory_movement_summary without sessionToken in payload', async () => {
      await ipcClient.material.getInventoryMovementSummary('material-123');

      expect(safeInvoke).toHaveBeenCalledWith('material_get_inventory_movement_summary', {
        material_id: 'material-123'
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
          reason: 'Purchase order'
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
          minimum_stock: 25
        },
        'token-c'
      );

      expect(invalidatePattern).toHaveBeenCalledWith('materials:*');
      expect(invalidatePattern).toHaveBeenCalledWith('material:*');
    });

    it('invalidates cache patterns for material_delete', async () => {
      await ipcClient.material.delete('material-123');

      expect(invalidatePattern).toHaveBeenCalledWith('materials:*');
      expect(invalidatePattern).toHaveBeenCalledWith('material:*');
    });

    it('invalidates cache patterns for record_consumption', async () => {
      await ipcClient.material.recordConsumption(
        {
          intervention_id: 'intervention-123',
          material_id: 'material-123',
          quantity_used: 15
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
          quantity: 100
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
              maximum_stock: 500
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            has_next: false,
            has_prev: false
          }
        }
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.material.list();

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
          updated_at: '2025-02-09T10:00:00Z'
        }
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.material.get('material-123');

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
            tool: 2
          },
          categories: {
            films: 5,
            adhesives: 3,
            tools: 2
          }
        }
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
              recorded_by: 'tech-001'
            },
          ],
          pagination: {
            page: 1,
            limit: 50,
            total: 1,
            has_next: false,
            has_prev: false
          }
        }
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.material.getConsumptionHistory('material-123');

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
            value: ''
          }
        }
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.material.create(
        {
          name: 'Test Material',
          material_type: 'ppf_film'
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
            material_id: 'non-existent-material'
          }
        }
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.material.get('non-existent-material');

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
            available_quantity: 50
          }
        }
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.material.updateStock(
        {
          material_id: 'material-123',
          quantity_change: -100,
          reason: 'Test withdrawal'
        },
        'token-f'
      );

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toHaveProperty('code', 'INSUFFICIENT_STOCK');
    });
  });
});