import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MaterialForm } from '../MaterialForm';
import { Material, MaterialType, UnitOfMeasure } from '@/lib/inventory';
import { useInventory } from '@/hooks/useInventory';

// Mock the useInventory hook
jest.mock('@/hooks/useInventory');
const mockUseInventory = useInventory as jest.MockedFunction<typeof useInventory>;

// Mock material data
const mockMaterial: Material = {
  id: '1',
  sku: 'PPF-001',
  name: 'PPF Film Standard',
  description: 'Standard PPF film for vehicles',
  material_type: 'ppf_film' as MaterialType,
  category: 'Films',
  subcategory: 'Standard',
  category_id: 'cat-1',
  brand: '3M',
  model: 'Pro',
  specifications: {},
  unit_of_measure: 'meter' as UnitOfMeasure,
  current_stock: 100.5,
  minimum_stock: 10,
  maximum_stock: 200,
  reorder_point: 15,
  unit_cost: 25.50,
  currency: 'EUR',
  supplier_id: 'sup-1',
  supplier_name: '3M Supplier',
  supplier_sku: '3M-PPF-001',
  quality_grade: 'A',
  certification: 'ISO-9001',
  expiry_date: '2024-12-31T23:59:59Z',
  batch_number: 'BATCH-001',
  serial_numbers: [],
  is_active: true,
  is_discontinued: false,
  storage_location: 'Warehouse A-1',
  warehouse_id: 'wh-1',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  created_by: 'user-1',
  updated_by: 'user-1',
  synced: true,
  last_synced_at: '2023-01-01T00:00:00Z',
};

describe('MaterialForm', () => {
  const mockCreateMaterial = jest.fn();
  const mockUpdateMaterial = jest.fn();
  const userId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseInventory.mockReturnValue({
      materials: [],
      loading: false,
      error: null,
      stats: null,
      lowStockMaterials: [],
      expiredMaterials: [],
      createMaterial: mockCreateMaterial,
      updateMaterial: mockUpdateMaterial,
      updateStock: jest.fn(),
      recordConsumption: jest.fn(),
      getMaterial: jest.fn(),
      getMaterialBySku: jest.fn(),
      getInterventionConsumption: jest.fn(),
      getInterventionSummary: jest.fn(),
      getMaterialStats: jest.fn(),
      refetch: jest.fn(),
      refetchStats: jest.fn(),
      refetchLowStock: jest.fn(),
      refetchExpired: jest.fn(),
    });
  });

  describe('create mode', () => {
    it('should render create form with empty fields', () => {
      render(<MaterialForm userId={userId} />);

      expect(screen.getByText('Add New Material')).toBeInTheDocument();
      expect(screen.getByLabelText('SKU *')).toBeInTheDocument();
      expect(screen.getByLabelText('Material Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Material Type *')).toBeInTheDocument();
      expect(screen.getByLabelText('Unit of Measure *')).toBeInTheDocument();
      expect(screen.getByLabelText('Current Stock *')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Material' })).toBeInTheDocument();
    });

    it('should create material with valid data', async () => {
      const newMaterial = { ...mockMaterial, id: '2', name: 'New Material' };
      mockCreateMaterial.mockResolvedValue(newMaterial);
      const onSuccess = jest.fn();

      render(<MaterialForm userId={userId} onSuccess={onSuccess} />);

      // Fill in the form
      await userEvent.type(screen.getByLabelText('SKU *'), 'NEW-001');
      await userEvent.type(screen.getByLabelText('Material Name *'), 'New Material');
      await userEvent.type(screen.getByLabelText('Current Stock *'), '50');

      // Select material type
      const typeSelect = screen.getByLabelText('Material Type *');
      await userEvent.click(typeSelect);
      await userEvent.click(screen.getByText('PPF Film'));

      // Select unit of measure
      const unitSelect = screen.getByLabelText('Unit of Measure *');
      await userEvent.click(unitSelect);
      await userEvent.click(screen.getByText('Meter'));

      // Submit form
      await userEvent.click(screen.getByRole('button', { name: 'Create Material' }));

      await waitFor(() => {
        expect(mockCreateMaterial).toHaveBeenCalledWith(
          {
            sku: 'NEW-001',
            name: 'New Material',
            material_type: 'ppf_film',
            unit_of_measure: 'meter',
            current_stock: 50,
            currency: 'EUR',
          },
          userId
        );
      });

      expect(onSuccess).toHaveBeenCalledWith(newMaterial);
    });

    it('should validate required fields', async () => {
      render(<MaterialForm userId={userId} />);

      // Try to submit without filling required fields
      await userEvent.click(screen.getByRole('button', { name: 'Create Material' }));

      await waitFor(() => {
        expect(screen.getByText('SKU is required')).toBeInTheDocument();
        expect(screen.getByText('Material name is required')).toBeInTheDocument();
      });

      expect(mockCreateMaterial).not.toHaveBeenCalled();
    });

    it('should handle create errors', async () => {
      const errorMessage = 'Failed to create material';
      mockCreateMaterial.mockRejectedValue(new Error(errorMessage));

      render(<MaterialForm userId={userId} />);

      // Fill in required fields
      await userEvent.type(screen.getByLabelText('SKU *'), 'NEW-001');
      await userEvent.type(screen.getByLabelText('Material Name *'), 'New Material');

      // Submit form
      await userEvent.click(screen.getByRole('button', { name: 'Create Material' }));

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe('edit mode', () => {
    it('should render edit form with material data', () => {
      render(<MaterialForm material={mockMaterial} userId={userId} />);

      expect(screen.getByText('Edit Material')).toBeInTheDocument();
      expect(screen.getByDisplayValue('PPF-001')).toBeInTheDocument();
      expect(screen.getByDisplayValue('PPF Film Standard')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Standard PPF film for vehicles')).toBeInTheDocument();
      expect(screen.getByDisplayValue('100.5')).toBeInTheDocument();
      expect(screen.getByDisplayValue('3M')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Pro')).toBeInTheDocument();
      expect(screen.getByDisplayValue('A')).toBeInTheDocument();
      expect(screen.getByDisplayValue('ISO-9001')).toBeInTheDocument();
      expect(screen.getByDisplayValue('BATCH-001')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Warehouse A-1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('3M Supplier')).toBeInTheDocument();
      expect(screen.getByDisplayValue('3M-PPF-001')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Update Material' })).toBeInTheDocument();
    });

    it('should update material with valid data', async () => {
      const updatedMaterial = { ...mockMaterial, name: 'Updated Material' };
      mockUpdateMaterial.mockResolvedValue(updatedMaterial);
      const onSuccess = jest.fn();

      render(<MaterialForm material={mockMaterial} userId={userId} onSuccess={onSuccess} />);

      // Update the name
      const nameInput = screen.getByDisplayValue('PPF Film Standard');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Material');

      // Submit form
      await userEvent.click(screen.getByRole('button', { name: 'Update Material' }));

      await waitFor(() => {
        expect(mockUpdateMaterial).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({
            name: 'Updated Material',
            sku: 'PPF-001',
          }),
          userId
        );
      });

      expect(onSuccess).toHaveBeenCalledWith(updatedMaterial);
    });
  });

  describe('form sections', () => {
    it('should render all form sections', () => {
      render(<MaterialForm userId={userId} />);

      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Specifications')).toBeInTheDocument();
      expect(screen.getByText('Inventory Information')).toBeInTheDocument();
      expect(screen.getByText('Pricing Information')).toBeInTheDocument();
      expect(screen.getByText('Supplier Information')).toBeInTheDocument();
      expect(screen.getByText('Storage Information')).toBeInTheDocument();
    });
  });

  describe('material type selection', () => {
    it('should show all material type options', async () => {
      render(<MaterialForm userId={userId} />);

      const typeSelect = screen.getByLabelText('Material Type *');
      await userEvent.click(typeSelect);

      expect(screen.getByText('PPF Film')).toBeInTheDocument();
      expect(screen.getByText('Adhesive')).toBeInTheDocument();
      expect(screen.getByText('Cleaning Solution')).toBeInTheDocument();
      expect(screen.getByText('Tool')).toBeInTheDocument();
      expect(screen.getByText('Consumable')).toBeInTheDocument();
    });
  });

  describe('unit of measure selection', () => {
    it('should show all unit of measure options', async () => {
      render(<MaterialForm userId={userId} />);

      const unitSelect = screen.getByLabelText('Unit of Measure *');
      await userEvent.click(unitSelect);

      expect(screen.getByText('Piece')).toBeInTheDocument();
      expect(screen.getByText('Meter')).toBeInTheDocument();
      expect(screen.getByText('Liter')).toBeInTheDocument();
      expect(screen.getByText('Gram')).toBeInTheDocument();
      expect(screen.getByText('Roll')).toBeInTheDocument();
    });
  });

  describe('cancel button', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const onCancel = jest.fn();
      render(<MaterialForm userId={userId} onCancel={onCancel} />);

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onCancel).toHaveBeenCalled();
    });

    it('should not show cancel button when onCancel is not provided', () => {
      render(<MaterialForm userId={userId} />);

      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    });
  });

  describe('numeric inputs', () => {
    it('should handle decimal values for numeric fields', async () => {
      render(<MaterialForm userId={userId} />);

      await userEvent.type(screen.getByLabelText('Current Stock *'), '99.99');
      await userEvent.type(screen.getByLabelText('Minimum Stock'), '10.5');
      await userEvent.type(screen.getByLabelText('Unit Cost'), '25.75');

      // Submit form
      await userEvent.click(screen.getByRole('button', { name: 'Create Material' }));

      await waitFor(() => {
        expect(mockCreateMaterial).toHaveBeenCalledWith(
          expect.objectContaining({
            current_stock: 99.99,
            minimum_stock: 10.5,
            unit_cost: 25.75,
          }),
          userId
        );
      });
    });

    it('should validate minimum values for numeric fields', async () => {
      render(<MaterialForm userId={userId} />);

      await userEvent.type(screen.getByLabelText('SKU *'), 'TEST-001');
      await userEvent.type(screen.getByLabelText('Material Name *'), 'Test Material');
      
      // Enter negative values
      await userEvent.type(screen.getByLabelText('Current Stock *'), '-10');
      await userEvent.type(screen.getByLabelText('Unit Cost'), '-5');

      await userEvent.click(screen.getByRole('button', { name: 'Create Material' }));

      await waitFor(() => {
        expect(screen.getByText('Stock must be positive')).toBeInTheDocument();
        expect(screen.getByText('Unit cost must be positive')).toBeInTheDocument();
      });
    });
  });

  describe('expiry date', () => {
    it('should handle expiry date input', async () => {
      render(<MaterialForm userId={userId} />);

      const expiryInput = screen.getByLabelText('Expiry Date');
      await userEvent.type(expiryInput, '2024-12-31');

      expect(expiryInput).toHaveValue('2024-12-31');
    });
  });

  describe('loading state', () => {
    it('should show loading state during submission', async () => {
      // Create a promise that we can control
      let resolvePromise: (value: Material) => void;
      const promise = new Promise<Material>((resolve) => {
        resolvePromise = resolve;
      });
      mockCreateMaterial.mockReturnValue(promise);

      render(<MaterialForm userId={userId} />);

      // Fill required fields
      await userEvent.type(screen.getByLabelText('SKU *'), 'TEST-001');
      await userEvent.type(screen.getByLabelText('Material Name *'), 'Test Material');

      // Submit form
      await userEvent.click(screen.getByRole('button', { name: 'Create Material' }));

      // Check for loading state
      expect(screen.getByRole('button', { name: 'Create Material' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Create Material' })).toBeInTheDocument();

      // Resolve the promise
      resolvePromise!(mockMaterial);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Create Material' })).not.toBeDisabled();
      });
    });
  });
});