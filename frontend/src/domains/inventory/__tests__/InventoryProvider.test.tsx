import { render, screen, waitFor } from '@testing-library/react';
import { InventoryProvider, useInventoryContext } from '../api/InventoryProvider';
import { useAuth } from '@/domains/auth';
import { inventoryIpc } from '../ipc/inventory.ipc';
import type { Material, InventoryStats, InventoryTransaction } from '../api/types';

jest.mock('@/domains/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../ipc/inventory.ipc', () => ({
  inventoryIpc: {
    material: {
      list: jest.fn(),
    },
    reporting: {
      getLowStockMaterials: jest.fn(),
      getExpiredMaterials: jest.fn(),
    },
    getInventoryStats: jest.fn(),
  },
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockInventoryIpc = inventoryIpc as jest.Mocked<typeof inventoryIpc>;

const createMaterial = (overrides: Partial<Material> = {}): Material => ({
  id: 'material-1',
  sku: 'PPF-001',
  name: 'Clear PPF Film',
  material_type: 'ppf_film',
  unit_of_measure: 'meter',
  current_stock: 50,
  currency: 'EUR',
  is_active: true,
  is_discontinued: false,
  created_at: '2025-02-10T10:00:00Z',
  updated_at: '2025-02-10T10:00:00Z',
  synced: true,
  ...overrides,
});

const createStats = (): InventoryStats => {
  const transaction: InventoryTransaction = {
    id: 'txn-1',
    material_id: 'material-1',
    transaction_type: 'stock_in',
    quantity: 10,
    previous_stock: 40,
    new_stock: 50,
    performed_by: 'user-1',
    performed_at: '2025-02-10T10:00:00Z',
    created_at: '2025-02-10T10:00:00Z',
    updated_at: '2025-02-10T10:00:00Z',
    synced: true,
  };

  return {
    total_materials: 1,
    active_materials: 1,
    low_stock_materials: 0,
    expired_materials: 0,
    total_value: 500,
    materials_by_category: {},
    recent_transactions: [transaction],
    stock_turnover_rate: 0.8,
    average_inventory_age: 10,
  };
};

const InventoryConsumer = () => {
  const { materials, loading } = useInventoryContext();
  if (loading) {
    return <div>loading</div>;
  }
  return <div>materials:{materials.length}</div>;
};

describe('InventoryProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides inventory data to consumers', async () => {
    mockUseAuth.mockReturnValue({ user: { token: 'session-token' } } as never);
    mockInventoryIpc.material.list.mockResolvedValue({ data: [createMaterial()] } as never);
    mockInventoryIpc.getInventoryStats.mockResolvedValue(createStats() as never);
    mockInventoryIpc.reporting.getLowStockMaterials.mockResolvedValue([] as never);
    mockInventoryIpc.reporting.getExpiredMaterials.mockResolvedValue([] as never);

    render(
      <InventoryProvider>
        <InventoryConsumer />
      </InventoryProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('materials:1')).toBeInTheDocument();
    });
  });
});
