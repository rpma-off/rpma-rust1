import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InventoryManager } from '@/domains/inventory';

jest.mock('@/domains/inventory/hooks/useInventory', () => ({
  useInventory: jest.fn(),
}));

jest.mock('@/domains/inventory/components/StockLevelIndicator', () => ({
  StockLevelIndicator: ({ material }: { material: { current_stock: number } }) => (
    <div data-testid="stock-level-indicator">{material.current_stock}</div>
  ),
}));

jest.mock('@/domains/inventory/components/MaterialForm', () => ({
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

const mockUseInventory = jest.requireMock('@/domains/inventory/hooks/useInventory').useInventory as jest.Mock;

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

describe('InventoryManager smoke tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseInventory.mockReturnValue(baseInventoryState);
  });

  it('renders the translated inventory header and table content', () => {
    render(<InventoryManager />);

    expect(screen.getByTestId('inventory-manager')).toBeInTheDocument();
    expect(screen.getByText("Gestion de l'inventaire")).toBeInTheDocument();
    expect(screen.getByText('Matériaux (1)')).toBeInTheDocument();
    expect(screen.getByText('PPF Film Standard')).toBeInTheDocument();
  });

  it('updates the search field value', async () => {
    const user = userEvent.setup();
    render(<InventoryManager />);

    const searchInput = screen.getByPlaceholderText('Rechercher des matériaux...');
    await user.type(searchInput, 'PPF');

    expect(searchInput).toHaveValue('PPF');
  });

  it('renders low-stock and expired alerts when the hook exposes them', () => {
    mockUseInventory.mockReturnValue({
      ...baseInventoryState,
      lowStockMaterials: [{ id: 'low-1' }],
      expiredMaterials: [{ id: 'expired-1' }],
    });

    render(<InventoryManager />);

    expect(screen.getAllByText(/stock faible/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/ont expiré/i)).toBeInTheDocument();
  });

  it('keeps import and export actions wired to buttons', () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    render(<InventoryManager />);

    expect(screen.getByText('Importer')).toBeInTheDocument();
    expect(screen.getByText('Exporter')).toBeInTheDocument();

    infoSpy.mockRestore();
  });
});
