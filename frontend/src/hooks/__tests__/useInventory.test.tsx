import { renderHook, waitFor } from '@testing-library/react';
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

const materialResponse = {
  success: true,
  data: [{
    id: 'material-1',
    sku: 'PPF-001',
    name: 'Clear PPF Film',
    material_type: 'ppf_film',
    unit_of_measure: 'meter',
    current_stock: 50,
    currency: 'EUR',
    is_active: true,
    is_discontinued: false,
    created_at: '2025-02-09T10:00:00Z',
    updated_at: '2025-02-09T10:00:00Z',
    synced: true,
  }],
};

const statsResponse = {
  success: true,
  data: {
    total_materials: 1,
    active_materials: 1,
    low_stock_materials: 0,
    expired_materials: 0,
    total_value: 775,
    materials_by_category: {},
    recent_transactions: [],
    stock_turnover_rate: 0.8,
    average_inventory_age: 20,
  },
};

describe('useInventory (tsx suite)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { token: 'session-token' },
    } as never);

    mockInvoke.mockImplementation(async (command: string) => {
      switch (command) {
        case 'material_list':
          return materialResponse;
        case 'inventory_get_stats':
          return statsResponse;
        case 'material_get_low_stock_materials':
        case 'material_get_expired_materials':
          return { success: true, data: [] };
        default:
          return { success: true, data: null };
      }
    });
  });

  it('loads inventory data and exposes refetch', async () => {
    const { result } = renderHook(() => useInventory());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.materials).toHaveLength(1);
    await result.current.refetch();
    expect(mockInvoke).toHaveBeenCalledWith('material_list', expect.objectContaining({ sessionToken: 'session-token' }));
  });

  it('uses query options when provided', async () => {
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
      expect(mockInvoke).toHaveBeenCalledWith('material_list', expect.objectContaining({
        sessionToken: 'session-token',
        materialType: 'ppf_film',
        category: 'Films',
        activeOnly: true,
        limit: 10,
        offset: 20,
      }));
    });
  });

  it('stops early with auth error when token missing', async () => {
    mockUseAuth.mockReturnValue({ user: null } as never);

    const { result } = renderHook(() => useInventory());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Authentication required');
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
