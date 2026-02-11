import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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

jest.mock('../StockLevelIndicator', () => ({
  StockLevelIndicator: () => <div data-testid="stock-level-indicator" />,
}));

// Mock Radix-based UI components to avoid portal/slot issues in jsdom
jest.mock('@/components/ui/dialog', () => {
  const React = require('react');
  const DialogContext = React.createContext({ open: false, setOpen: (_open: boolean) => {} });

  const Dialog = ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (value: boolean) => void;
  }) => {
    const [internalOpen, setInternalOpen] = React.useState(!!open);

    React.useEffect(() => {
      if (typeof open === 'boolean') {
        setInternalOpen(open);
      }
    }, [open]);

    const setOpen = (value: boolean) => {
      setInternalOpen(value);
      onOpenChange?.(value);
    };

    return (
      <DialogContext.Provider value={{ open: internalOpen, setOpen }}>
        <div>{children}</div>
      </DialogContext.Provider>
    );
  };

  const DialogTrigger = ({ children }: { children: React.ReactNode }) => {
    const { setOpen } = React.useContext(DialogContext);
    return <div onClick={() => setOpen(true)}>{children}</div>;
  };

  const DialogContent = ({ children }: { children: React.ReactNode }) => {
    const { open } = React.useContext(DialogContext);
    return open ? <div>{children}</div> : null;
  };

  const DialogHeader = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const DialogTitle = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

  return { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle };
});

jest.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: () => null,
}));

jest.mock('@/components/ui/virtualized-table', () => ({
  VirtualizedTable: ({
    data,
    columns,
  }: {
    data: Array<Record<string, any>>;
    columns: Array<{
      key: string;
      render?: (value: any, item: Record<string, any>, index: number) => React.ReactNode;
    }>;
  }) => (
    <div>
      {data.map((item, index) => (
        <div key={item.id || index} data-testid="virtualized-row">
          {columns.map((column) => {
            const value = item[column.key];
            const content = column.render ? column.render(item, item, index) : String(value ?? '');
            return (
              <div key={String(column.key)} data-testid={`col-${String(column.key)}`}>
                {content}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  ),
}));

jest.mock('@/components/ui/select', () => {
  const React = require('react');
  const SelectContext = React.createContext({ onValueChange: (_value: string) => {} });

  const Select = ({ children, onValueChange }: { children: React.ReactNode; onValueChange?: (value: string) => void }) => (
    <SelectContext.Provider value={{ onValueChange: onValueChange || (() => {}) }}>
      <div>{children}</div>
    </SelectContext.Provider>
  );

  const SelectTrigger = ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  );

  const SelectValue = ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  );

  const SelectContent = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  );

  const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => {
    const { onValueChange } = React.useContext(SelectContext);
    return (
      <div role="option" onClick={() => onValueChange(value)}>
        {children}
      </div>
    );
  };

  return {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
  };
});

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
      is_low_stock: true,
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
    
    mockUseInventory.mockImplementation((options) => {
      const materialType = options?.material_type ?? null;
      const category = options?.category ?? null;
      const activeOnly = options?.active_only ?? true;

      const filteredMaterials = mockMaterials.filter((material) => {
        if (activeOnly && material.is_active === false) return false;
        if (materialType && material.material_type !== materialType) return false;
        if (category && material.category !== category) return false;
        return true;
      });

      return {
        materials: filteredMaterials,
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
      };
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
      const totalMaterialsCard = screen.getByText('Total Materials').closest('div')?.parentElement;
      expect(totalMaterialsCard).not.toBeNull();
      expect(within(totalMaterialsCard as HTMLElement).getByText('3')).toBeInTheDocument();

      const lowStockCard = screen.getByText('Low Stock Items').closest('div')?.parentElement;
      expect(lowStockCard).not.toBeNull();
      expect(within(lowStockCard as HTMLElement).getByText('1')).toBeInTheDocument();

      const expiredCard = screen.getByText('Expired Items').closest('div')?.parentElement;
      expect(expiredCard).not.toBeNull();
      expect(within(expiredCard as HTMLElement).getByText('1')).toBeInTheDocument();

      const totalValueCard = screen.getByText('Total Value').closest('div')?.parentElement;
      expect(totalValueCard).not.toBeNull();
      expect(within(totalValueCard as HTMLElement).getByText('€5,000.75')).toBeInTheDocument();

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

      await waitFor(() => {
        expect(screen.getByText('PPF Film Standard')).toBeInTheDocument();
        expect(screen.queryByText('Adhesive Premium')).not.toBeInTheDocument();
        expect(screen.queryByText('Application Tool')).not.toBeInTheDocument();
      });
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

      await waitFor(() => {
        expect(screen.getByText('PPF Film Standard')).toBeInTheDocument();
        expect(screen.queryByText('Adhesive Premium')).not.toBeInTheDocument();
        expect(screen.queryByText('Application Tool')).not.toBeInTheDocument();
      });
    });
  });

  describe('filter functionality', () => {
    it('should filter by material type', async () => {
      render(<InventoryManager />);

      const typeSelect = screen.getByText('Select type');
      await userEvent.click(typeSelect);
      const [ppfOption] = screen.getAllByText('PPF Film');
      await userEvent.click(ppfOption);

      expect(screen.getByText('PPF Film Standard')).toBeInTheDocument();
      expect(screen.queryByText('Adhesive Premium')).not.toBeInTheDocument();
      expect(screen.queryByText('Application Tool')).not.toBeInTheDocument();
    });

    it('should filter by category', async () => {
      // Add categories to materials
      const materialsWithCategories = [
        { ...mockMaterials[0], category: 'Films' },
        { ...mockMaterials[1], category: 'Adhesives' },
        { ...mockMaterials[2], category: 'Tools' },
      ];
      mockUseInventory.mockImplementation((options) => {
        const materialType = options?.material_type ?? null;
        const category = options?.category ?? null;
        const activeOnly = options?.active_only ?? true;

        const filteredMaterials = materialsWithCategories.filter((material) => {
          if (activeOnly && material.is_active === false) return false;
          if (materialType && material.material_type !== materialType) return false;
          if (category && material.category !== category) return false;
          return true;
        });

        return {
          materials: filteredMaterials,
          loading: false,
          error: null,
          stats: mockStats,
          lowStockMaterials: [materialsWithCategories[1]],
          expiredMaterials: [materialsWithCategories[2]],
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
        };
      });

      render(<InventoryManager />);

      const categorySelect = screen.getAllByText('Select category')[0];
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
      
      const materialsWithInactive = [...mockMaterials, inactiveMaterial];
      mockUseInventory.mockImplementation((options) => {
        const materialType = options?.material_type ?? null;
        const category = options?.category ?? null;
        const activeOnly = options?.active_only ?? true;

        const filteredMaterials = materialsWithInactive.filter((material) => {
          if (activeOnly && material.is_active === false) return false;
          if (materialType && material.material_type !== materialType) return false;
          if (category && material.category !== category) return false;
          return true;
        });

        return {
          materials: filteredMaterials,
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
        };
      });

      render(<InventoryManager />);

      // Initially should not show inactive
      expect(screen.queryByText('Inactive Material')).not.toBeInTheDocument();

      // Toggle to show inactive
      await userEvent.click(screen.getByText('Show Inactive'));
      
      await waitFor(() => {
        expect(screen.getByText('Inactive Material')).toBeInTheDocument();
      });
    });
  });

  describe('loading and error states', () => {
    it('should show loading state', () => {
      mockUseInventory.mockReturnValue({
        ...mockUseInventory(),
        loading: true,
      });

      render(<InventoryManager />);

      const refreshIcons = screen.getAllByTestId('refresh-icon');
      expect(refreshIcons.some((node) => node.classList.contains('animate-spin'))).toBe(true);
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
          materials_by_category: {},
          recent_transactions: [],
          stock_turnover_rate: 0,
          average_inventory_age: 0,
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
    it('should handle export button click', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<InventoryManager />);
      
      const exportButton = screen.getByText('Export');
      await userEvent.click(exportButton);
      
      expect(consoleSpy).toHaveBeenCalledWith('Exporting inventory...');
      
      consoleSpy.mockRestore();
    });

    it('should handle import button click', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<InventoryManager />);
      
      const importButton = screen.getByText('Import');
      await userEvent.click(importButton);
      
      expect(consoleSpy).toHaveBeenCalledWith('Importing inventory...');
      
      consoleSpy.mockRestore();
    });
  });

  describe('material actions', () => {
    it('should open create dialog when Add Material is clicked', async () => {
      render(<InventoryManager />);

      const addButton = screen.getByText('Add Material');
      await userEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getAllByText('Add New Material').length).toBeGreaterThan(0);
      });
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
      const ppfRow = screen.getByText('PPF Film Standard').closest('[data-testid="virtualized-row"]');
      expect(ppfRow).not.toBeNull();
      expect(within(ppfRow as HTMLElement).getByText('OK')).toBeInTheDocument();

      // Adhesive Premium - low stock
      const adhesiveRow = screen.getByText('Adhesive Premium').closest('[data-testid="virtualized-row"]');
      expect(adhesiveRow).not.toBeNull();
      expect(within(adhesiveRow as HTMLElement).getByText('Low')).toBeInTheDocument();

      // Application Tool - out of stock and expired
      const toolRow = screen.getByText('Application Tool').closest('[data-testid="virtualized-row"]');
      expect(toolRow).not.toBeNull();
      expect(within(toolRow as HTMLElement).getByText('Expired')).toBeInTheDocument();
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

      const row = screen.getByText('PPF Film Standard').closest('[data-testid="virtualized-row"]');
      expect(row).not.toBeNull();
      const unitCostCell = within(row as HTMLElement).getByTestId('col-unit_cost');
      expect(within(unitCostCell).getByText('€25.50')).toBeInTheDocument();
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

      const row = screen.getByText('PPF Film Standard').closest('[data-testid="virtualized-row"]');
      expect(row).not.toBeNull();
      const unitCostCell = within(row as HTMLElement).getByTestId('col-unit_cost');
      expect(within(unitCostCell).getByText('N/A')).toBeInTheDocument();
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

      const row = screen.getByText('PPF Film Standard').closest('[data-testid="virtualized-row"]');
      expect(row).not.toBeNull();
      const locationCell = within(row as HTMLElement).getByTestId('col-location');
      expect(within(locationCell).getByText('Warehouse A-1')).toBeInTheDocument();
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

      const row = screen.getByText('PPF Film Standard').closest('[data-testid="virtualized-row"]');
      expect(row).not.toBeNull();
      const locationCell = within(row as HTMLElement).getByTestId('col-location');
      expect(within(locationCell).getByText('N/A')).toBeInTheDocument();
    });
  });
});


