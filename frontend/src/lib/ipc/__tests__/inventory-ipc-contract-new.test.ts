import {
  materialOperations,
  stockOperations,
  consumptionOperations,
  transactionOperations,
  reportingOperations,
} from '@/domains/inventory/server';
import { safeInvoke } from '@/lib/ipc/core';

jest.mock('@/lib/ipc/core', () => ({
  safeInvoke: jest.fn(),
}));

const mockSafeInvoke = safeInvoke as jest.MockedFunction<typeof safeInvoke>;

describe('inventory server IPC contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls material list with sessionToken-first payloads', async () => {
    mockSafeInvoke.mockResolvedValue({ data: [], pagination: { page: 1, limit: 10, total: 0 } } as never);

    await materialOperations.list({ page: 1, limit: 10, material_type: 'ppf_film' as never });

    expect(mockSafeInvoke).toHaveBeenCalledWith('material_list', {
      page: 1,
      limit: 10,
      material_type: 'ppf_film'
    });
  });

  it('calls material create with request nested under sessionToken', async () => {
    const request = {
      sku: 'TEST-MAT-001',
      name: 'Test Material 1',
      material_type: 'ppf_film' as const,
      unit_of_measure: 'meter' as const,
      current_stock: 50
    };
    mockSafeInvoke.mockResolvedValue({ id: 'material-1', ...request } as never);

    await materialOperations.create(request);

    expect(mockSafeInvoke).toHaveBeenCalledWith('material_create', {
      request
    });
  });

  it('calls material update with id and request payload', async () => {
    const request = { name: 'Updated name', current_stock: 75 };
    mockSafeInvoke.mockResolvedValue({ id: 'material-1', ...request } as never);

    await materialOperations.update('material-1', request);

    expect(mockSafeInvoke).toHaveBeenCalledWith('material_update', {
      id: 'material-1',
      request
    });
  });

  it('calls stock update with current request shape', async () => {
    const request = {
      material_id: 'material-1',
      quantity_change: 5,
      reason: 'Restock'
    };
    mockSafeInvoke.mockResolvedValue({ id: 'material-1', current_stock: 55 } as never);

    await stockOperations.updateStock(request);

    expect(mockSafeInvoke).toHaveBeenCalledWith('material_update_stock', {
      request
    });
  });

  it('calls consumption record and transaction history endpoints with sessionToken payloads', async () => {
    const consumptionRequest = {
      intervention_id: 'intervention-1',
      material_id: 'material-1',
      quantity_used: 2
    };

    mockSafeInvoke.mockResolvedValueOnce(undefined as never);
    mockSafeInvoke.mockResolvedValueOnce([] as never);

    await consumptionOperations.recordConsumption(consumptionRequest);
    await transactionOperations.getTransactionHistory('material-1');

    expect(mockSafeInvoke).toHaveBeenNthCalledWith(1, 'material_record_consumption', {
      request: consumptionRequest
    });
    expect(mockSafeInvoke).toHaveBeenNthCalledWith(2, 'material_get_transaction_history', {
      material_id: 'material-1',
      page: 1,
      limit: 50
    });
  });

  it('calls reporting operations with sessionToken-only payloads', async () => {
    mockSafeInvoke.mockResolvedValueOnce({
      items: [
        {
          material_id: 'material-1',
          sku: 'TEST-MAT-001',
          name: 'Test Material 1',
          unit_of_measure: 'meter',
          current_stock: 5,
          reserved_stock: 0,
          available_stock: 5,
          minimum_stock: 10,
          effective_threshold: 10,
          shortage_quantity: 5
        },
      ],
      total: 1
    } as never);
    mockSafeInvoke.mockResolvedValueOnce([] as never);

    await reportingOperations.getLowStockMaterials('test-token');
    await reportingOperations.getExpiredMaterials('test-token');

    expect(mockSafeInvoke).toHaveBeenNthCalledWith(1, 'material_get_low_stock_materials', {
    });
    expect(mockSafeInvoke).toHaveBeenNthCalledWith(2, 'material_get_expired_materials', {
    });
  });
});
