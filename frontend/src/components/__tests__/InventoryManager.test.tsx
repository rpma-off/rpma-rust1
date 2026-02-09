import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InventoryManager } from '../InventoryManager';
import { useInventory } from '@/hooks/useInventory';
import { useInventoryStats } from '@/hooks/useInventoryStats';
import { Material, MaterialType, UnitOfMeasure, InventoryStats } from '@/lib/inventory';

// Mock the hooks
jest.mock('@/hooks/useInventory');
jest.mock('@/hooks/useInventoryStats');

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  RefreshCw: ({ className }: { className?: string }) => <div data-testid="refresh-icon" className={className} />,
  Package: () => <div data-testid="package-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Upload: () => <div data-testid="upload-icon" />,
}));

const mockUseInventory = useInventory as jest.MockedFunction<typeof useInventory>;
const mockUseInventoryStats = useInventoryStats as jest.MockedFunction<typeof useInventoryStats>;

// Mock material data
const createMockMaterial = (overrides: Partial<Material> = {}): Material => ({
  id: '1',
  sku: 'PPF-001',
  name: 'PPF Film Standard',
  description: 'Standard PPF film for vehicles',
  material_type: 'ppf_film' as MaterialType,
  unit_of_measure: 'meter' as UnitOfMeasure,
  current_stock: 100,
  currency: 'EUR',
  is_active: true,
  is_discontinued: false,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  synced: true,
  ...overrides,
});

// Mock inventory stats
const mockInventoryStats: InventoryStats = {
  total_materials: 50,
  active_materials: 45,
  low_stock_materials: 3,
  expired_materials: 1,
  total_value: 10000.50,
  materials_by_category: { 'Films': 20, 'Tools': 15, 'Consumables': 15 },
  recent_transactions: [],
  stock_turnover_rate: 2.5,
  average_inventory_age: 30.5,
};

describe('InventoryManager', () => {
  const mockMaterials = [
    createMockMaterial({ name: 'PPF Film Standard', brand: '3M' }),
    createMockMaterial({ 
      id: '2', 
      sku: 'ADH-001', 
      name: 'Adhesive Premium',
      material_type: 'adhesive' as MaterialType,
      category: 'Adhesives',
      current_stock: 5,
      minimum_stock: 10,
    }),
    createMockMaterial({
      id: '3',
      sku: 'TOOL-001',
      name: 'Application Tool',
      material_type: 'tool' as MaterialType,
      category: 'Tools',
      current_stock: 0,
      expiry_date: '2023-01-01T00:00:00Z',
      is_expired: true,
    }),
  ];

  const mockStats = {
    total_materials: 3,
    active_materials: 2,
    low_stock_materials: 1,
    expired_materials: 1,
    total_value: 5000.75,
    materials_by_category: {},
    recent_transactions: [],
    stock_turnover_rate: 0,
    average_inventory_age: 0,
  };

  const mockRefetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseInventory.mockReturnValue({
      materials: mockMaterials,
      loading: false,
      error: null,
      stats: mockStats,
      lowStockMaterials: [mockMaterials[1]],
      expiredMaterials: [mockMaterials[2]],
      refetch: mockRefetch,
      createMaterial: jest.fn(),
      updateMaterial: jest.fn(),
      updateStock: jest.fn(),
      recordConsumption: jest.fn(),
      getMaterial: jest.fn(),
      getMaterialBySku: jest.fn(),
      getInterventionConsumption: jest.fn(),
      getInterventionSummary: jest.fn(),
      getMaterialStats: jest.fn(),
      refetchStats: jest.fn(),
      refetchLowStock: jest.fn(),
      refetchExpired: jest.fn(),
    });

    mockUseInventoryStats.mockReturnValue({
      stats: mockInventoryStats,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  describe('initial render', () => {
    it('should render the inventory manager with all sections', () => {
      render(<InventoryManager />);

      expect(screen.getByText('Inventory Management')).toBeInTheDocument();
      expect(screen.getByText('Manage your material inventory and track stock levels')).toBeInTheDocument();
      
      // Stats cards
      expect(screen.getByText('Total Materials')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Low Stock Items')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Expired Items')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Total Value')).toBeInTheDocument();
      expect(screen.getByText('€5,000.75')).toBeInTheDocument();

      // Materials table
      expect(screen.getByText('Materials (3)')).toBeInTheDocument();
      expect(screen.getByText('PPF Film Standard')).toBeInTheDocument();
      expect(screen.getByText('Adhesive Premium')).toBeInTheDocument();
      expect(screen.getByText('Application Tool')).toBeInTheDocument();
    });

    it('should show alerts for low stock and expired materials', () => {
      render(<InventoryManager />);

      expect(screen.getByText(/1 material\(s\) are running low on stock/)).toBeInTheDocument();
      expect(screen.getByText(/1 material\(s\) have expired and should be removed/)).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(<InventoryManager />);

      expect(screen.getByText('Import')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
      expect(screen.getByText('Add Material')).toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    it('should filter materials by search term', async () => {
      render(<InventoryManager />);

      const searchInput = screen.getByPlaceholderText('Search materials...');
      await userEvent.type(searchInput, 'PPF');

      expect(screen.getByText('PPF Film Standard')).toBeInTheDocument();
      expect(screen.queryByText('Adhesive Premium')).not.toBeInTheDocument();
      expect(screen.queryByText('Application Tool')).not.toBeInTheDocument();
    });

    it('should filter materials by SKU', async () => {
      render(<InventoryManager />);

      const searchInput = screen.getByPlaceholderText('Search materials...');
      await userEvent.type(searchInput, 'ADH-001');

      expect(screen.queryByText('PPF Film Standard')).not.toBeInTheDocument();
      expect(screen.getByText('Adhesive Premium')).toBeInTheDocument();
      expect(screen.queryByText('Application Tool')).not.toBeInTheDocument();
    });

    it('should filter materials by brand', async () => {
      render(<InventoryManager />);

      const searchInput = screen.getByPlaceholderText('Search materials...');
      await userEvent.type(searchInput, '3M');

      expect(screen.getByText('PPF Film Standard')).toBeInTheDocument();
      expect(screen.queryByText('Adhesive Premium')).not.toBeInTheDocument();
      expect(screen.queryByText('Application Tool')).not.toBeInTheDocument();
    });
  });

  describe('filter functionality', () => {
    it('should filter by material type', async () => {
      render(<InventoryManager />);

      const typeSelect = screen.getByText('Select type');
      await userEvent.click(typeSelect);
      await userEvent.click(screen.getByText('PPF Film'));

      expect(screen.getByText('PPF Film Standard')).toBeInTheDocument();
      expect(screen.queryByText('Adhesive Premium')).not.toBeInTheDocument();
      expect(screen.queryByText('Application Tool')).not.toBeInTheDocument();
    });

    it('should filter by category', async () => {
      render(<InventoryManager />);

      // Add categories to materials
      const materialsWithCategories = [
        { ...mockMaterials[0], category: 'Films' },
        { ...mockMaterials[1], category: 'Adhesives' },
        { ...mockMaterials[2], category: 'Tools' },
      ];
      mockUseInventory.mockReturnValue({
        ...mockUseInventory(),
        materials: materialsWithCategories,
      });

      render(<InventoryManager />);

      const categorySelect = screen.getByText('Select category');
      await userEvent.click(categorySelect);
      await userEvent.click(screen.getByText('Films'));

      expect(screen.getByText('PPF Film Standard')).toBeInTheDocument();
      expect(screen.queryByText('Adhesive Premium')).not.toBeInTheDocument();
      expect(screen.queryByText('Application Tool')).not.toBeInTheDocument();
    });

    it('should toggle inactive materials', async () => {
      const inactiveMaterial = createMockMaterial({ 
        id: '4', 
        name: 'Inactive Material',
        is_active: false 
      });
      
      mockUseInventory.mockReturnValue({
        ...mockUseInventory(),
        materials: [...mockMaterials, inactiveMaterial],
      });

      render(<InventoryManager />);

      // Initially should not show inactive
      expect(screen.queryByText('Inactive Material')).not.toBeInTheDocument();

      // Toggle to show inactive
      await userEvent.click(screen.getByText('Show Inactive'));
      
      expect(screen.getByText('Inactive Material')).toBeInTheDocument();
    });
  });

  describe('loading and error states', () => {
    it('should show loading state', () => {
      mockUseInventory.mockReturnValue({
        ...mockUseInventory(),
        loading: true,
      });

      render(<InventoryManager />);

      expect(screen.getByTestId('refresh-icon')).toHaveClass('animate-spin');
    });

    it('should show error state', () => {
      mockUseInventory.mockReturnValue({
        ...mockUseInventory(),
        error: 'Failed to load materials',
      });

      render(<InventoryManager />);

      expect(screen.getByText('Failed to load materials')).toBeInTheDocument();
    });

    it('should show empty state when no materials', () => {
      mockUseInventory.mockReturnValue({
        ...mockUseInventory(),
        materials: [],
        stats: {
          total_materials: 0,
          active_materials: 0,
          low_stock_materials: 0,
          expired_materials: 0,
          total_value: 0,
        },
      });

      render(<InventoryManager />);

      expect(screen.getByText('No materials found')).toBeInTheDocument();
      expect(screen.getByText('Get started by adding your first material to the inventory.')).toBeInTheDocument();
      expect(screen.getByText('Add First Material')).toBeInTheDocument();
    });

    it('should show filtered empty state', async () => {
      render(<InventoryManager />);

      const searchInput = screen.getByPlaceholderText('Search materials...');
      await userEvent.type(searchInput, 'NonExistent');

      expect(screen.getByText('No materials found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your filters or search terms.')).toBeInTheDocument();
      expect(screen.queryByText('Add First Material')).not.toBeInTheDocument();
    });
  });

  describe('refresh functionality', () => {
    it('should call refetch when refresh button is clicked', async () => {
      render(<InventoryManager />);

      const refreshButton = screen.getByTestId('refresh-icon').closest('button');
      if (refreshButton) {
        await userEvent.click(refreshButton);
        expect(mockRefetch).toHaveBeenCalled();
      }
    });
  });

  describe('export and import functionality', () => {
    it('should handle export button click', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<InventoryManager />);
      
      const exportButton = screen.getByText('Export');
      userEvent.click(exportButton);
      
      expect(consoleSpy).toHaveBeenCalledWith('Exporting inventory...');
      
      consoleSpy.mockRestore();
    });

    it('should handle import button click', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<InventoryManager />);
      
      const importButton = screen.getByText('Import');
      userEvent.click(importButton);
      
      expect(consoleSpy).toHaveBeenCalledWith('Importing inventory...');
      
      consoleSpy.mockRestore();
    });
  });

  describe('material actions', () => {
    it('should open create dialog when Add Material is clicked', async () => {
      render(<InventoryManager />);

      const addButton = screen.getByText('Add Material');
      await userEvent.click(addButton);

      expect(screen.getByText('Add New Material')).toBeInTheDocument();
    });

    it('should show edit and view actions for each material', () => {
      render(<InventoryManager />);

      // Check that action buttons are present for each material
      const editButtons = screen.getAllByTestId('edit-icon');
      const viewButtons = screen.getAllByTestId('eye-icon');

      expect(editButtons).toHaveLength(mockMaterials.length);
      expect(viewButtons).toHaveLength(mockMaterials.length);
    });
  });

  describe('material status display', () => {
    it('should show correct status for each material', () => {
      render(<InventoryManager />);

      // PPF Film Standard - optimal stock
      const ppfRow = screen.getByText('PPF Film Standard').closest('tr');
      expect(ppfRow).toHaveTextContent('OK');

      // Adhesive Premium - low stock
      const adhesiveRow = screen.getByText('Adhesive Premium').closest('tr');
      expect(adhesiveRow).toHaveTextContent('Low');

      // Application Tool - out of stock and expired
      const toolRow = screen.getByText('Application Tool').closest('tr');
      expect(toolRow).toHaveTextContent('Expired');
    });
  });

  describe('material type badges', () => {
    it('should show material type badges', () => {
      render(<InventoryManager />);

      expect(screen.getByText('ppf film')).toBeInTheDocument();
      expect(screen.getByText('adhesive')).toBeInTheDocument();
      expect(screen.getByText('tool')).toBeInTheDocument();
    });
  });

  describe('unit cost display', () => {
    it('should display unit cost when available', () => {
      const materialWithCost = createMockMaterial({
        unit_cost: 25.50,
      });

      mockUseInventory.mockReturnValue({
        ...mockUseInventory(),
        materials: [materialWithCost],
      });

      render(<InventoryManager />);

      expect(screen.getByText('€25.50')).toBeInTheDocument();
    });

    it('should show N/A when unit cost is not available', () => {
      const materialWithoutCost = createMockMaterial({
        unit_cost: undefined,
      });

      mockUseInventory.mockReturnValue({
        ...mockUseInventory(),
        materials: [materialWithoutCost],
      });

      render(<InventoryManager />);

      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  describe('storage location display', () => {
    it('should display storage location when available', () => {
      const materialWithLocation = createMockMaterial({
        storage_location: 'Warehouse A-1',
      });

      mockUseInventory.mockReturnValue({
        ...mockUseInventory(),
        materials: [materialWithLocation],
      });

      render(<InventoryManager />);

      expect(screen.getByText('Warehouse A-1')).toBeInTheDocument();
    });

    it('should show N/A when storage location is not available', () => {
      const materialWithoutLocation = createMockMaterial({
        storage_location: undefined,
      });

      mockUseInventory.mockReturnValue({
        ...mockUseInventory(),
        materials: [materialWithoutLocation],
      });

      render(<InventoryManager />);

      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });
});