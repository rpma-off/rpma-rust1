import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InventoryManager } from './InventoryManager';

jest.mock('../hooks/useInventory', () => ({
  useInventory: jest.fn(),
}));

jest.mock('./StockLevelIndicator', () => ({
  StockLevelIndicator: ({ material }: { material: { current_stock: number } }) => (
    <div data-testid="stock-level-indicator">{material.current_stock}</div>
  ),
}));

jest.mock('./MaterialForm', () => ({
  MaterialForm: () => <div>Formulaire matériau</div>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: () => null,
}));

jest.mock('@/components/ui/virtualized-table', () => ({
  VirtualizedTable: ({
    data,
    columns,
  }: {
    data: Array<Record<string, unknown>>;
    columns: Array<{ key: string; render?: (_value: unknown, item: Record<string, unknown>, index: number) => React.ReactNode }>;
  }) => (
    <div>
      {data.map((item, index) => (
        <div key={String(item.id ?? index)} data-testid="inventory-row">
          {columns.map((column) => (
            <div key={column.key}>
              {column.render ? column.render(item[column.key], item, index) : String(item[column.key] ?? '')}
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

jest.mock('@/components/ui/select', () => {
  const React = require('react');
  const SelectContext = React.createContext({ onValueChange: (_value: string) => {} });

  return {
    Select: ({ children, onValueChange }: { children: React.ReactNode; onValueChange?: (value: string) => void }) => (
      <SelectContext.Provider value={{ onValueChange: onValueChange ?? (() => {}) }}>
        <div>{children}</div>
      </SelectContext.Provider>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => {
      const { onValueChange } = React.useContext(SelectContext);
      return (
        <button type="button" onClick={() => onValueChange(value)}>
          {children}
        </button>
      );
    },
  };
});

const mockUseInventory = jest.requireMock('../hooks/useInventory').useInventory as jest.Mock;

const baseInventoryState = {
  materials: [
    {
      id: 'material-1',
      sku: 'PPF-001',
      name: 'PPF Film Standard',
      material_type: 'ppf_film',
      current_stock: 42,
      currency: 'EUR',
      is_low_stock: false,
      is_expired: false,
      is_discontinued: false,
    },
  ],
  loading: false,
  error: null,
  stats: {
    total_materials: 42,
    active_materials: 38,
    low_stock_materials: 5,
    expired_materials: 2,
    total_value: 15500.5,
  },
  lowStockMaterials: [],
  expiredMaterials: [],
  refetch: jest.fn(),
  deleteMaterial: jest.fn(),
  getMaterial: jest.fn(),
  getMaterialBySku: jest.fn(),
};

describe('InventoryManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseInventory.mockReturnValue(baseInventoryState);
  });

  it('renders current inventory header and material data', () => {
    render(<InventoryManager />);

    expect(screen.getByTestId('inventory-manager')).toBeInTheDocument();
    expect(screen.getByText("Gestion de l'inventaire")).toBeInTheDocument();
    expect(screen.getByText('PPF Film Standard')).toBeInTheDocument();
    expect(screen.getByText('Matériaux (1)')).toBeInTheDocument();
  });

  it('filters materials using the search input', async () => {
    const user = userEvent.setup();
    render(<InventoryManager />);

    await user.type(screen.getByPlaceholderText('Rechercher des matériaux...'), 'PPF');

    expect(screen.getByPlaceholderText('Rechercher des matériaux...')).toHaveValue('PPF');
  });

  it('shows the empty state when no materials are available', () => {
    mockUseInventory.mockReturnValue({
      ...baseInventoryState,
      materials: [],
      stats: { ...baseInventoryState.stats, total_materials: 0 },
    });

    render(<InventoryManager />);

    expect(screen.getByText('Aucun matériau trouvé')).toBeInTheDocument();
    expect(screen.getByText(/Commencez par ajouter votre premier matériau/i)).toBeInTheDocument();
    expect(screen.getByText('Ajouter le premier matériau')).toBeInTheDocument();
  });

  it('surfaces hook errors in the alert area', () => {
    mockUseInventory.mockReturnValue({
      ...baseInventoryState,
      error: 'Failed to load materials',
    });

    render(<InventoryManager />);

    expect(screen.getByText('Failed to load materials')).toBeInTheDocument();
  });
});
