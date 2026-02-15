import { act, renderHook, waitFor } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import { useInventory } from '../useInventory';
import { useAuth } from '@/lib/auth/compatibility';

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

jest.mock('@/lib/auth/compatibility', () => ({
  useAuth: jest.fn(),
}));

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const mockMaterial = {
  id: 'mat-1',
  sku: 'PPF-001',
  name: 'PPF Film',
  material_type: 'ppf_film',
  unit_of_measure: 'meter',
  current_stock: 100,
  currency: 'EUR',
  is_active: true,
  is_discontinued: false,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  synced: true,
};

const mockStats = {
  total_materials: 1,
  active_materials: 1,
  low_stock_materials: 0,
  expired_materials: 0,
  total_value: 1000,
  materials_by_category: {},
  recent_transactions: [],
  stock_turnover_rate: 1.5,
  average_inventory_age: 10,
};

function success<T>(data: T) {
  return { success: true, data };
}

describe('useInventory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { token: 'session-token' },
    } as never);

    mockInvoke.mockImplementation(async (command: string) => {
      switch (command) {
        case 'material_list':
          return success([mockMaterial]);
        case 'inventory_get_stats':
          return success(mockStats);
        case 'material_get_low_stock_materials':
          return success([]);
        case 'material_get_expired_materials':
          return success([]);
        case 'material_create':
          return success(mockMaterial);
        case 'material_update_stock':
          return success(mockMaterial);
        case 'material_get':
          return success(mockMaterial);
        default:
          return success(null);
      }
    });
  });

  it('loads materials and stats when authenticated', async () => {
    const { result } = renderHook(() => useInventory());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.materials).toHaveLength(1);
    expect(result.current.stats?.total_materials).toBe(1);
    expect(mockInvoke).toHaveBeenCalledWith('material_list', expect.objectContaining({ sessionToken: 'session-token' }));
    expect(mockInvoke).toHaveBeenCalledWith('inventory_get_stats', expect.objectContaining({ sessionToken: 'session-token' }));
  });

  it('returns auth error when token is missing', async () => {
    mockUseAuth.mockReturnValue({ user: null } as never);

    const { result } = renderHook(() => useInventory());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Authentication required');
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('passes query filters to material_list', async () => {
    renderHook(() =>
      useInventory({
        material_type: 'ppf_film',
        category: 'Films',
        active_only: true,
        limit: 10,
        offset: 0,
      })
    );

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('material_list', expect.objectContaining({
        sessionToken: 'session-token',
        materialType: 'ppf_film',
        category: 'Films',
        activeOnly: true,
        limit: 10,
        offset: 0,
      }));
    });
  });

  it('creates a material with session token', async () => {
    const { result } = renderHook(() => useInventory());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createMaterial({
        sku: 'NEW-001',
        name: 'New',
        material_type: 'ppf_film',
        unit_of_measure: 'meter',
      });
    });

    expect(mockInvoke).toHaveBeenCalledWith('material_create', expect.objectContaining({
      sessionToken: 'session-token',
      request: expect.objectContaining({ sku: 'NEW-001' }),
    }));
  });

  it('updates stock with session token', async () => {
    const { result } = renderHook(() => useInventory());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateStock({
        material_id: 'mat-1',
        quantity: 5,
        transaction_type: 'stock_in',
        notes: 'restock',
      });
    });

    expect(mockInvoke).toHaveBeenCalledWith('material_update_stock', expect.objectContaining({
      sessionToken: 'session-token',
      request: expect.objectContaining({ material_id: 'mat-1' }),
    }));
  });

  it('gets one material by id', async () => {
    const { result } = renderHook(() => useInventory());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const material = await result.current.getMaterial('mat-1');
    expect(material?.id).toBe('mat-1');
    expect(mockInvoke).toHaveBeenCalledWith('material_get', expect.objectContaining({
      sessionToken: 'session-token',
      id: 'mat-1',
    }));
  });
});
