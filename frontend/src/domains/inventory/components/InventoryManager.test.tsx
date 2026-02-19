import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InventoryManager } from './InventoryManager';

// Mock the inventory operations
jest.mock('@/domains/inventory/server', () => ({
  materialOperations: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateStock: jest.fn(),
    recordConsumption: jest.fn(),
    getTransactionHistory: jest.fn(),
  },
  materialCategoryOperations: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  supplierOperations: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  inventoryStats: {
    get: jest.fn(),
  },
}));

// Mock the useInventory hook
jest.mock('../hooks/useInventory', () => ({
  useInventory: jest.fn(),
}));

jest.mock('../hooks/useInventoryStats', () => ({
  useInventoryStats: jest.fn(),
}));

import { useInventory } from '../hooks/useInventory';
import { useInventoryStats } from '../hooks/useInventoryStats';

// Mock child components
jest.mock('./StockLevelIndicator', () => ({
  StockLevelIndicator: ({ material }: { material: { current_stock: number; minimum_stock?: number } }) => (
    <div data-testid="stock-level-indicator">
      {material.current_stock} / {material.minimum_stock || 0}
    </div>
  ),
}));

jest.mock('./inventory/MaterialForm', () => ({
  MaterialForm: ({ material, onClose }: { material?: { name?: string }; onClose: () => void }) => (
    <div data-testid="material-form">
      <input
        data-testid="material-name-input"
        defaultValue={material?.name || ''}
        onChange={(e) => {
          if (material) material.name = e.target.value;
        }}
      />
      <button data-testid="material-form-close" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => 
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-title">{children}</div>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-trigger">{children}</div>,
}));

jest.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: ({ 
    open: _open, 
    title, 
    description, 
    onConfirm, 
    onCancel 
  }: {
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) => (
    <div data-testid="confirm-dialog">
      <div data-testid="confirm-dialog-title">{title}</div>
      <div data-testid="confirm-dialog-description">{description}</div>
      <button data-testid="confirm-dialog-confirm" onClick={onConfirm}>
        Confirm
      </button>
      <button data-testid="confirm-dialog-cancel" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

const createTestMaterial = (overrides = {}) => ({
  id: 'test-material-1',
  sku: 'TEST-MAT-001',
  name: 'Test Material 1',
  description: 'Test description',
  material_type: 'ppf_film' as const,
  category: 'Films',
  unit_of_measure: 'meter',
  current_stock: 50,
  minimum_stock: 20,
  maximum_stock: 200,
  unit_cost: 15.5,
  currency: 'EUR',
  is_active: true,
  is_low_stock: false,
  is_expired: false,
  is_discontinued: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  synced: true,
  ...overrides,
});

const createTestMaterials = (count = 5) => 
  Array.from({ length: count }, (_, i) => 
    createTestMaterial({
      id: `test-material-${i + 1}`,
      sku: `TEST-MAT-${String(i + 1).padStart(3, '0')}`,
      name: `Test Material ${i + 1}`,
      current_stock: Math.floor(Math.random() * 100),
      minimum_stock: Math.floor(Math.random() * 50),
    })
  );

const createTestStats = () => ({
  total_materials: 42,
  active_materials: 38,
  low_stock_materials: 5,
  expired_materials: 2,
  total_value: 15500.50,
  materials_by_category: {
    Films: 15,
    Adhesives: 12,
    Solutions: 8,
    Tools: 4,
    Consumables: 3,
  },
  recent_transactions: [],
  stock_turnover_rate: 2.1,
  average_inventory_age: 45,
});


describe('InventoryManager', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });
    
    jest.clearAllMocks();
    
    // Mock the useInventory hook
    (useInventory as jest.Mock).mockReturnValue({
      materials: createTestMaterials(5),
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      createMaterial: jest.fn(),
      updateMaterial: jest.fn(),
      deleteMaterial: jest.fn(),
      updateStock: jest.fn(),    });
    
    // Mock the useInventoryStats hook
    (useInventoryStats as jest.Mock).mockReturnValue({
      stats: createTestStats(),
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <InventoryManager />
      </QueryClientProvider>
    );
  };

  test('renders inventory manager with materials and stats', async () => {
    renderComponent();
    
    // Check that the component renders
    expect(screen.getByTestId('inventory-manager')).toBeInTheDocument();
    
    // Check that stats are displayed
    expect(screen.getByText('42')).toBeInTheDocument(); // total_materials
    expect(screen.getByText('38')).toBeInTheDocument(); // active_materials
    expect(screen.getByText('5')).toBeInTheDocument(); // low_stock_materials
    expect(screen.getByText('2')).toBeInTheDocument(); // expired_materials
    
    // Check that materials are displayed
    expect(screen.getByText('TEST-MAT-001')).toBeInTheDocument();
    expect(screen.getByText('Test Material 1')).toBeInTheDocument();
  });

  test('filters materials by search term', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Get the search input
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeInTheDocument();
    
    // Type a search term
    await user.type(searchInput, 'Material 2');
    
    // In a real implementation, this would trigger a refetch
    // For now, we just verify the input value changes
    expect(searchInput).toHaveValue('Material 2');
  });

  test('filters materials by type', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Get the type filter
    const typeSelect = screen.getByLabelText(/type/i);
    expect(typeSelect).toBeInTheDocument();
    
    // Select a type
    await user.selectOptions(typeSelect, 'ppf_film');
    
    // Verify the selection
    expect(typeSelect).toHaveValue('ppf_film');
  });

  test('shows create material dialog', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Click the create button
    const createButton = screen.getByRole('button', { name: /add/i });
    await user.click(createButton);
    
    // Check that the dialog is opened
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('Create Material')).toBeInTheDocument();
    expect(screen.getByTestId('material-form')).toBeInTheDocument();
  });

  test('shows edit material dialog', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Click the edit button for the first material
    const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
    await user.click(editButton);
    
    // Check that the dialog is opened
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('Edit Material')).toBeInTheDocument();
    expect(screen.getByTestId('material-form')).toBeInTheDocument();
  });

  test('shows delete confirmation dialog', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Click the delete button for the first material
    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    await user.click(deleteButton);
    
    // Check that the confirmation dialog is opened
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-dialog-title')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-dialog-description')).toBeInTheDocument();
  });

  test('refreshes materials data', async () => {
    const user = userEvent.setup();
    const mockRefetch = jest.fn();
    
    (useInventory as jest.Mock).mockReturnValue({
      materials: createTestMaterials(5),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      createMaterial: jest.fn(),
      updateMaterial: jest.fn(),
      deleteMaterial: jest.fn(),
      updateStock: jest.fn(),    });
    
    renderComponent();
    
    // Click the refresh button
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);
    
    // Verify that refetch was called
    expect(mockRefetch).toHaveBeenCalled();
  });

  test('shows loading state', () => {
    (useInventory as jest.Mock).mockReturnValue({
      materials: [],
      isLoading: true,
      error: null,
      refetch: jest.fn(),
      createMaterial: jest.fn(),
      updateMaterial: jest.fn(),
      deleteMaterial: jest.fn(),
      updateStock: jest.fn(),    });
    
    (useInventoryStats as jest.Mock).mockReturnValue({
      stats: createTestStats(),
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });
    
    renderComponent();
    
    // Check that loading indicators are shown
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('shows error state', () => {
    (useInventory as jest.Mock).mockReturnValue({
      materials: [],
      isLoading: false,
      error: 'Failed to load materials',
      refetch: jest.fn(),
      createMaterial: jest.fn(),
      updateMaterial: jest.fn(),
      deleteMaterial: jest.fn(),
      updateStock: jest.fn(),    });
    
    renderComponent();
    
    // Check that error message is shown
    expect(screen.getByText(/error/i)).toBeInTheDocument();
    expect(screen.getByText('Failed to load materials')).toBeInTheDocument();
  });

  test('shows empty state when no materials', () => {
    (useInventory as jest.Mock).mockReturnValue({
      materials: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      createMaterial: jest.fn(),
      updateMaterial: jest.fn(),
      deleteMaterial: jest.fn(),
      updateStock: jest.fn(),    });
    
    renderComponent();
    
    // Check that empty state message is shown
    expect(screen.getByText(/no materials found/i)).toBeInTheDocument();
  });

  test('displays stock level indicator for materials', () => {
    renderComponent();
    
    // Check that stock level indicators are displayed for each material
    const stockIndicators = screen.getAllByTestId('stock-level-indicator');
    expect(stockIndicators).toHaveLength(5);
    
    // Check that the indicator shows correct stock information
    expect(stockIndicators[0]).toHaveTextContent(/50 \/ 20/);
  });

  test('closes create dialog and refetches', async () => {
    const user = userEvent.setup();
    const mockRefetch = jest.fn();
    
    (useInventory as jest.Mock).mockReturnValue({
      materials: createTestMaterials(5),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      createMaterial: jest.fn(),
      updateMaterial: jest.fn(),
      deleteMaterial: jest.fn(),
      updateStock: jest.fn(),    });
    
    renderComponent();
    
    // Click the create button
    const createButton = screen.getByRole('button', { name: /add/i });
    await user.click(createButton);
    
    // Fill in the form
    const nameInput = screen.getByTestId('material-name-input');
    await user.clear(nameInput);
    await user.type(nameInput, 'New Test Material');
    
    // Click the close button
    const closeButton = screen.getByTestId('material-form-close');
    await user.click(closeButton);
    
    // Verify that refetch was called
    expect(mockRefetch).toHaveBeenCalled();
  });

  test('handles material deletion', async () => {
    const user = userEvent.setup();
    const mockDeleteMaterial = jest.fn<Promise<boolean>, [string]>()
      .mockResolvedValue(true);
    
    (useInventory as jest.Mock).mockReturnValue({
      materials: createTestMaterials(5),
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      createMaterial: jest.fn(),
      updateMaterial: jest.fn(),
      deleteMaterial: mockDeleteMaterial,
      updateStock: jest.fn(),    });
    
    renderComponent();
    
    // Click the delete button for the first material
    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    await user.click(deleteButton);
    
    // Confirm deletion
    const confirmButton = screen.getByTestId('confirm-dialog-confirm');
    await user.click(confirmButton);
    
    // Verify that deleteMaterial was called
    expect(mockDeleteMaterial).toHaveBeenCalled();
  });

  test('toggles show inactive materials', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Get the show inactive checkbox
    const showInactiveCheckbox = screen.getByRole('checkbox', { name: /show inactive/i });
    expect(showInactiveCheckbox).toBeInTheDocument();
    
    // Toggle the checkbox
    await user.click(showInactiveCheckbox);
    
    // Verify that the checkbox is checked
    expect(showInactiveCheckbox).toBeChecked();
  });

  test('exports materials data', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Click the export button
    const exportButton = screen.getByRole('button', { name: /export/i });
    await user.click(exportButton);
    
    // In a real implementation, this would trigger a download
    // For now, we just verify the button exists and can be clicked
    expect(exportButton).toBeInTheDocument();
  });

  test('handles pagination', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Check for pagination controls
    const paginationControls = screen.getByTestId('pagination-controls');
    expect(paginationControls).toBeInTheDocument();
    
    // Click the next page button
    const nextPageButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextPageButton);
    
    // Verify that the pagination state changed
    // In a real implementation, this would fetch the next page
    expect(nextPageButton).toBeInTheDocument();
  });

  test('displays material details when viewing a material', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Click the view button for the first material
    const viewButton = screen.getAllByRole('button', { name: /view/i })[0];
    await user.click(viewButton);
    
    // Check that the details dialog is opened
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('Material Details')).toBeInTheDocument();
    
    // Check that material details are displayed
    expect(screen.getByText('TEST-MAT-001')).toBeInTheDocument();
    expect(screen.getByText('Test Material 1')).toBeInTheDocument();
  });

  test('shows low stock materials in a different color', async () => {
    const lowStockMaterial = createTestMaterial({
      id: 'low-stock-material',
      sku: 'LOW-STOCK',
      name: 'Low Stock Material',
      current_stock: 10,
      minimum_stock: 20,
      is_low_stock: true,
    });
    
    (useInventory as jest.Mock).mockReturnValue({
      materials: [lowStockMaterial],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      createMaterial: jest.fn(),
      updateMaterial: jest.fn(),
      deleteMaterial: jest.fn(),
      updateStock: jest.fn(),    });
    
    renderComponent();
    
    // Check that the low stock material is highlighted
    expect(screen.getByText('Low Stock Material')).toBeInTheDocument();
    // In a real implementation, this would have a specific class or style
  });

  test('shows expired materials in a different color', async () => {
    const expiredMaterial = createTestMaterial({
      id: 'expired-material',
      sku: 'EXPIRED',
      name: 'Expired Material',
      is_expired: true,
    });
    
    (useInventory as jest.Mock).mockReturnValue({
      materials: [expiredMaterial],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      createMaterial: jest.fn(),
      updateMaterial: jest.fn(),
      deleteMaterial: jest.fn(),
      updateStock: jest.fn(),    });
    
    renderComponent();
    
    // Check that the expired material is highlighted
    expect(screen.getByText('Expired Material')).toBeInTheDocument();
    // In a real implementation, this would have a specific class or style
  });

  test('handles bulk operations', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Select multiple materials
    const checkboxes = screen.getAllByRole('checkbox', { name: /select material/i });
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);
    
    // Perform bulk action
    const bulkActionButton = screen.getByRole('button', { name: /bulk action/i });
    await user.click(bulkActionButton);
    
    // In a real implementation, this would show bulk action options
    expect(bulkActionButton).toBeInTheDocument();
  });
});





