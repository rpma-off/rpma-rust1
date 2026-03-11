import React from 'react';
import { render, screen } from '@testing-library/react';
import { MaterialCatalog } from '../MaterialCatalog';

jest.mock('@/domains/auth', () => ({
  useAuth: () => ({ user: { token: 'session-token' } }),
}));

jest.mock('@/shared/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params?.name ? `${key}:${params.name}` : key,
  }),
}));

jest.mock('../../hooks/useMaterials', () => ({
  useMaterials: jest.fn(),
}));

jest.mock('../../hooks/useInventory', () => ({
  useInventory: jest.fn(),
}));

jest.mock('../MaterialForm', () => ({
  MaterialForm: () => <div>Material form</div>,
}));

jest.mock('@/components/ui/virtualized-table', () => ({
  VirtualizedTable: ({ data }: { data: unknown[] }) => (
    <div data-testid="virtualized-table">{data.length}</div>
  ),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockUseMaterials = jest.requireMock('../../hooks/useMaterials').useMaterials as jest.Mock;
const mockUseInventory = jest.requireMock('../../hooks/useInventory').useInventory as jest.Mock;

const makeMaterial = (index: number) => ({
  id: `material-${index}`,
  sku: `SKU-${index}`,
  name: `Material ${index}`,
  material_type: 'tool',
  current_stock: index + 1,
  minimum_stock: 0,
  unit_of_measure: 'pcs',
  unit_cost: 10,
  currency: 'EUR',
  is_active: true,
});

describe('MaterialCatalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseInventory.mockReturnValue({
      stats: { materials_by_category: {} },
      updateStock: jest.fn(),
      deleteMaterial: jest.fn(),
    });
  });

  it('uses virtualization when more than 50 materials are displayed', () => {
    mockUseMaterials.mockReturnValue({
      materials: Array.from({ length: 51 }, (_, index) => makeMaterial(index)),
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<MaterialCatalog />);

    expect(screen.getByTestId('virtualized-table')).toHaveTextContent('51');
  });
});
