import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { InventoryManager } from '../../InventoryManager';

// Mock the IPC client
jest.mock('@/lib/ipc/client', () => ({
  ipcClient: {
    material: {
      list: jest.fn(),
      get: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateStock: jest.fn(),
      getLowStockMaterials: jest.fn(),
      getStats: jest.fn(),
    },
  },
}));

const mockIpcClient = jest.requireMock('@/lib/ipc/client').ipcClient;

// Mock the router
jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    pathname: '/inventory',
    query: {},
  })),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('InventoryManager', () => {
  const mockUser = {
    user_id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
  };

  const mockMaterials = [
    {
      id: 'material-1',
      sku: 'PPF-001',
      name: 'Clear PPF Film',
      material_type: 'ppf_film',
      current_stock: 50,
      minimum_stock: 20,
      maximum_stock: 500,
      unit_cost: 15.5,
      unit_of_measure: 'meter',
      created_at: '2025-02-09T10:00:00Z',
      updated_at: '2025-02-09T10:00:00Z',
    },
    {
      id: 'material-2',
      sku: 'ADH-001',
      name: 'PPF Adhesive',
      material_type: 'adhesive',
      current_stock: 25,
      minimum_stock: 10,
      maximum_stock: 100,
      unit_cost: 8.75,
      unit_of_measure: 'liter',
      created_at: '2025-02-09T10:00:00Z',
      updated_at: '2025-02-09T10:00:00Z',
    },
  ];

  const mockStats = {
    total_materials: 2,
    total_value: 950.0,
    low_stock_count: 0,
    expired_count: 0,
    material_types: {
      ppf_film: 1,
      adhesive: 1,
    },
    categories: {
      films: 1,
      adhesives: 1,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIpcClient.material.list.mockResolvedValue({
      success: true,
      data: {
        materials: mockMaterials,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          has_next: false,
          has_prev: false,
        },
      },
    });

    mockIpcClient.material.getStats.mockResolvedValue({
      success: true,
      data: mockStats,
    });

    mockIpcClient.material.getLowStockMaterials.mockResolvedValue({
      success: true,
      data: [],
    });
  });

  describe('Initial Loading', () => {
    it('displays loading state', () => {
      mockIpcClient.material.list.mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<InventoryManager />);

      expect(screen.getByText('Loading inventory data...')).toBeInTheDocument();
    });

    it('displays error message on failure', async () => {
      mockIpcClient.material.list.mockResolvedValue({
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Failed to load inventory data',
        },
      });

      renderWithProviders(<InventoryManager />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load inventory data/)).toBeInTheDocument();
      });
    });

    it('loads and displays materials', async () => {
      renderWithProviders(<InventoryManager />);

      await waitFor(() => {
        expect(screen.getByText('PPF-001')).toBeInTheDocument();
        expect(screen.getByText('Clear PPF Film')).toBeInTheDocument();
        expect(screen.getByText('ADH-001')).toBeInTheDocument();
        expect(screen.getByText('PPF Adhesive')).toBeInTheDocument();
      });
    });

    it('displays inventory statistics', async () => {
      renderWithProviders(<InventoryManager />);

      await waitFor(() => {
        expect(screen.getByText('Total Materials')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('Total Value')).toBeInTheDocument();
        expect(screen.getByText('€950.00')).toBeInTheDocument();
        expect(screen.getByText('Low Stock Items')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });
  });

  describe('Material Display', () => {
    it('displays materials with correct information', async () => {
      renderWithProviders(<InventoryManager />);

      await waitFor(() => {
        const filmRow = screen.getByText('Clear PPF Film').closest('tr');
        const adhesiveRow = screen.getByText('PPF Adhesive').closest('tr');

        // Check film details
        expect(filmRow).toHaveTextContent('PPF-001');
        expect(filmRow).toHaveTextContent('50');
        expect(filmRow).toHaveTextContent('meter');
        expect(filmRow).toHaveTextContent('€15.50');

        // Check adhesive details
        expect(adhesiveRow).toHaveTextContent('ADH-001');
        expect(adhesiveRow).toHaveTextContent('25');
        expect(adhesiveRow).toHaveTextContent('liter');
        expect(adhesiveRow).toHaveTextContent('€8.75');
      });
    });

    it('displays sync indicators', async () => {
      const materialWithSync = {
        ...mockMaterials[0],
        sync_status: 'pending',
        last_sync_attempt: '2025-02-09T11:00:00Z',
      };

      mockIpcClient.material.list.mockResolvedValue({
        success: true,
        data: {
          materials: [materialWithSync],
          pagination: { page: 1, limit: 20, total: 1, has_next: false, has_prev: false },
        },
      });

      renderWithProviders(<InventoryManager />);

      await waitFor(() => {
        expect(screen.getByTitle('Sync pending')).toBeInTheDocument();
      });
    });

    it('displays low stock alerts', async () => {
      const lowStockMaterial = {
        ...mockMaterials[0],
        current_stock: 15, // Below minimum of 20
      };

      mockIpcClient.material.list.mockResolvedValue({
        success: true,
        data: {
          materials: [lowStockMaterial],
          pagination: { page: 1, limit: 20, total: 1, has_next: false, has_prev: false },
        },
      });

      renderWithProviders(<InventoryManager />);

      await waitFor(() => {
        expect(screen.getByTitle('Low stock')).toBeInTheDocument();
      });
    });
  });

  describe('Material Creation', () => {
    it('opens create form when clicking add button', async () => {
      renderWithProviders(<InventoryManager />);

      await waitFor(() => {
        expect(screen.getByText('Add Material')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Add Material'));

      await waitFor(() => {
        expect(screen.getByText('Add New Material')).toBeInTheDocument();
        expect(screen.getByLabelText('SKU')).toBeInTheDocument();
        expect(screen.getByLabelText('Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Material Type')).toBeInTheDocument();
      });
    });

    it('creates new material with valid data', async () => {
      mockIpcClient.material.create.mockResolvedValue({
        success: true,
        data: {
          id: 'material-new',
          sku: 'NEW-PPF-001',
          name: 'New PPF Film',
          material_type: 'ppf_film',
          current_stock: 0,
        },
      });

      renderWithProviders(<InventoryManager />);

      // Open create form
      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Material'));
      });

      // Fill form
      await waitFor(() => {
        fireEvent.change(screen.getByLabelText('SKU'), { target: { value: 'NEW-PPF-001' } });
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New PPF Film' } });
        fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Test description' } });
        fireEvent.selectOptions(screen.getByLabelText('Material Type'), 'ppf_film');
        fireEvent.change(screen.getByLabelText('Minimum Stock'), { target: { value: '20' } });
        fireEvent.change(screen.getByLabelText('Maximum Stock'), { target: { value: '500' } });
        fireEvent.change(screen.getByLabelText('Unit Cost'), { target: { value: '15.50' } });
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: 'Create Material' }));

      await waitFor(() => {
        expect(mockIpcClient.material.create).toHaveBeenCalledWith(
          {
            sku: 'NEW-PPF-001',
            name: 'New PPF Film',
            description: 'Test description',
            material_type: 'ppf_film',
            minimum_stock: 20,
            maximum_stock: 500,
            unit_cost: 15.50,
          },
          expect.any(String) // session token
        );
      });

      // Verify modal closes and new material appears
      await waitFor(() => {
        expect(screen.queryByText('Add New Material')).not.toBeInTheDocument();
        expect(screen.getByText('NEW-PPF-001')).toBeInTheDocument();
        expect(screen.getByText('New PPF Film')).toBeInTheDocument();
      });
    });

    it('shows validation errors for required fields', async () => {
      renderWithProviders(<InventoryManager />);

      // Open create form
      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Material'));
      });

      // Submit empty form
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Create Material' }));
      });

      await waitFor(() => {
        expect(screen.getByText('SKU is required')).toBeInTheDocument();
        expect(screen.getByText('Name is required')).toBeInTheDocument();
        expect(screen.getByText('Material type is required')).toBeInTheDocument();
      });
    });
  });

  describe('Material Editing', () => {
    it('opens edit form when clicking edit button', async () => {
      renderWithProviders(<InventoryManager />);

      await waitFor(() => {
        const editButtons = screen.getAllByTitle('Edit material');
        expect(editButtons.length).toBeGreaterThan(0);
        fireEvent.click(editButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText('Edit Material')).toBeInTheDocument();
        expect(screen.getByDisplayValue('PPF-001')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Clear PPF Film')).toBeInTheDocument();
      });
    });

    it('updates material with valid data', async () => {
      mockIpcClient.material.update.mockResolvedValue({
        success: true,
        data: {
          ...mockMaterials[0],
          name: 'Updated Clear PPF Film',
          minimum_stock: 25,
        },
      });

      renderWithProviders(<InventoryManager />);

      // Open edit form
      await waitFor(() => {
        const editButtons = screen.getAllByTitle('Edit material');
        fireEvent.click(editButtons[0]);
      });

      // Update fields
      await waitFor(() => {
        fireEvent.change(screen.getByDisplayValue('Clear PPF Film'), {
          target: { value: 'Updated Clear PPF Film' },
        });
        fireEvent.change(screen.getByDisplayValue('20'), {
          target: { value: '25' },
        });
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: 'Update Material' }));

      await waitFor(() => {
        expect(mockIpcClient.material.update).toHaveBeenCalledWith(
          'material-1',
          {
            name: 'Updated Clear PPF Film',
            minimum_stock: 25,
          },
          expect.any(String) // session token
        );
      });

      // Verify modal closes and material is updated
      await waitFor(() => {
        expect(screen.queryByText('Edit Material')).not.toBeInTheDocument();
        expect(screen.getByText('Updated Clear PPF Film')).toBeInTheDocument();
      });
    });
  });

  describe('Stock Management', () => {
    it('opens stock adjustment dialog', async () => {
      renderWithProviders(<InventoryManager />);

      await waitFor(() => {
        const stockButtons = screen.getAllByTitle('Adjust stock');
        expect(stockButtons.length).toBeGreaterThan(0);
        fireEvent.click(stockButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText('Stock Adjustment')).toBeInTheDocument();
        expect(screen.getByLabelText('Quantity Change')).toBeInTheDocument();
        expect(screen.getByLabelText('Reason')).toBeInTheDocument();
      });
    });

    it('updates stock with valid data', async () => {
      mockIpcClient.material.updateStock.mockResolvedValue({
        success: true,
        data: {
          ...mockMaterials[0],
          current_stock: 75, // 50 + 25
        },
      });

      renderWithProviders(<InventoryManager />);

      // Open stock adjustment
      await waitFor(() => {
        const stockButtons = screen.getAllByTitle('Adjust stock');
        fireEvent.click(stockButtons[0]);
      });

      // Fill adjustment form
      await waitFor(() => {
        fireEvent.change(screen.getByLabelText('Quantity Change'), {
          target: { value: '25' },
        });
        fireEvent.change(screen.getByLabelText('Reason'), {
          target: { value: 'Purchase order PO-001' },
        });
      });

      // Submit adjustment
      fireEvent.click(screen.getByRole('button', { name: 'Update Stock' }));

      await waitFor(() => {
        expect(mockIpcClient.material.updateStock).toHaveBeenCalledWith(
          {
            material_id: 'material-1',
            quantity_change: 25,
            reason: 'Purchase order PO-001',
          },
          expect.any(String) // session token
        );
      });

      // Verify modal closes and stock is updated
      await waitFor(() => {
        expect(screen.queryByText('Stock Adjustment')).not.toBeInTheDocument();
        expect(screen.getByText('75')).toBeInTheDocument();
      });
    });

    it('validates stock adjustment input', async () => {
      renderWithProviders(<InventoryManager />);

      // Open stock adjustment
      await waitFor(() => {
        const stockButtons = screen.getAllByTitle('Adjust stock');
        fireEvent.click(stockButtons[0]);
      });

      // Submit empty form
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Update Stock' }));
      });

      await waitFor(() => {
        expect(screen.getByText('Quantity change is required')).toBeInTheDocument();
        expect(screen.getByText('Reason is required')).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filtering', () => {
    it('searches materials by SKU', async () => {
      const searchResults = [mockMaterials[0]]; // Only PPF-001

      mockIpcClient.material.list.mockResolvedValue({
        success: true,
        data: {
          materials: searchResults,
          pagination: { page: 1, limit: 20, total: 1, has_next: false, has_prev: false },
        },
      });

      renderWithProviders(<InventoryManager />);

      await waitFor(() => {
        fireEvent.change(screen.getByPlaceholderText('Search materials...'), {
          target: { value: 'PPF-001' },
        });
      });

      await waitFor(() => {
        expect(mockIpcClient.material.list).toHaveBeenCalledWith(
          expect.any(String), // session token
          expect.objectContaining({
            search: 'PPF-001',
          })
        );
      });

      expect(screen.getByText('PPF-001')).toBeInTheDocument();
      expect(screen.queryByText('ADH-001')).not.toBeInTheDocument();
    });

    it('filters materials by type', async () => {
      const filteredResults = [mockMaterials[0]]; // Only PPF film

      mockIpcClient.material.list.mockResolvedValue({
        success: true,
        data: {
          materials: filteredResults,
          pagination: { page: 1, limit: 20, total: 1, has_next: false, has_prev: false },
        },
      });

      renderWithProviders(<InventoryManager />);

      await waitFor(() => {
        fireEvent.change(screen.getByLabelText('Material Type'), {
          target: { value: 'ppf_film' },
        });
      });

      await waitFor(() => {
        expect(mockIpcClient.material.list).toHaveBeenCalledWith(
          expect.any(String), // session token
          expect.objectContaining({
            material_type: 'ppf_film',
          })
        );
      });

      expect(screen.getByText('PPF-001')).toBeInTheDocument();
      expect(screen.queryByText('ADH-001')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles create material errors gracefully', async () => {
      mockIpcClient.material.create.mockResolvedValue({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'SKU already exists',
        },
      });

      renderWithProviders(<InventoryManager />);

      // Open create form
      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Material'));
      });

      // Fill form
      await waitFor(() => {
        fireEvent.change(screen.getByLabelText('SKU'), {
          target: { value: 'DUPLICATE-SKU' },
        });
        fireEvent.change(screen.getByLabelText('Name'), {
          target: { value: 'Test Material' },
        });
        fireEvent.selectOptions(screen.getByLabelText('Material Type'), 'ppf_film');
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: 'Create Material' }));

      await waitFor(() => {
        expect(screen.getByText('SKU already exists')).toBeInTheDocument();
      });
    });

    it('handles stock update errors gracefully', async () => {
      mockIpcClient.material.updateStock.mockResolvedValue({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid quantity change',
        },
      });

      renderWithProviders(<InventoryManager />);

      // Open stock adjustment
      await waitFor(() => {
        const stockButtons = screen.getAllByTitle('Adjust stock');
        fireEvent.click(stockButtons[0]);
      });

      // Fill adjustment form
      await waitFor(() => {
        fireEvent.change(screen.getByLabelText('Quantity Change'), {
          target: { value: '-100' }, // More than current stock
        });
        fireEvent.change(screen.getByLabelText('Reason'), {
          target: { value: 'Test withdrawal' },
        });
      });

      // Submit adjustment
      fireEvent.click(screen.getByRole('button', { name: 'Update Stock' }));

      await waitFor(() => {
        expect(screen.getByText('Invalid quantity change')).toBeInTheDocument();
      });
    });
  });
});