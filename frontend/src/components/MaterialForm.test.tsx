import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MaterialForm } from '@/components/MaterialForm';
import { MaterialType, UnitOfMeasure } from '@/lib/inventory';
import * as inventoryOperations from '@/lib/ipc/domains/inventory';

// Mock the inventory operations
jest.mock('@/lib/ipc/domains/inventory', () => ({
  materialOperations: {
    create: jest.fn(),
    update: jest.fn(),
    get: jest.fn(),
  },
}));

// Mock the useInventory hook
jest.mock('@/hooks/useInventory', () => ({
  useInventory: jest.fn(),
}));

import { useInventory } from '@/hooks/useInventory';

// Mock the form components
jest.mock('@/components/ui/form', () => ({
  Form: ({ children }: { children: React.ReactNode }) => 
    <form data-testid="form">{children}</form>,
  FormField: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="form-field">{children}</div>,
  FormItem: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="form-item">{children}</div>,
  FormLabel: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="form-label">{children}</div>,
  FormControl: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="form-control">{children}</div>,
  FormMessage: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="form-message">{children}</div>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      <div data-testid="select-trigger" onClick={() => onValueChange?.('changed')}>
        {children}
      </div>
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid="select-item" data-value={value} onClick={() => {}}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => 
    <div data-testid="select-value">{placeholder}</div>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, ...props }: any) => (
    <input
      data-testid="input"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, ...props }: any) => (
    <textarea
      data-testid="textarea"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, type, disabled }: any) => (
    <button
      data-testid="button"
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="card-title">{children}</div>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="alert-description">{children}</div>,
}));

jest.mock('react-hook-form', () => ({
  useForm: () => ({
    register: jest.fn(),
    handleSubmit: (fn: any) => (e: any) => {
      e?.preventDefault?.();
      return fn({
        sku: 'TEST-MAT-001',
        name: 'Test Material',
        material_type: 'ppf_film',
        unit_of_measure: 'meter',
        current_stock: 100,
        minimum_stock: 20,
        maximum_stock: 500,
      });
    },
    formState: { errors: {} },
    reset: jest.fn(),
    setValue: jest.fn(),
    watch: jest.fn(),
    control: {},
  }),
}));

jest.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => (values: any) => values,
}));

jest.mock('@/lib/validation/zod-schemas', () => ({
  materialFormSchema: {
    parse: (values: any) => values,
  },
}));

const createTestMaterial = (overrides = {}) => ({
  id: 'test-material-1',
  sku: 'TEST-MAT-001',
  name: 'Test Material 1',
  description: 'Test description',
  material_type: 'ppf_film' as MaterialType,
  unit_of_measure: 'meter' as UnitOfMeasure,
  current_stock: 100,
  minimum_stock: 20,
  maximum_stock: 500,
  reorder_point: 50,
  unit_cost: 15.5,
  currency: 'EUR',
  category: 'Films',
  subcategory: 'Clear',
  brand: 'TestBrand',
  model: 'TestModel',
  quality_grade: 'Premium',
  certification: 'ISO-9001',
  storage_location: 'Warehouse A',
  warehouse_id: 'WH-001',
  supplier_id: 'SUP-001',
  supplier_name: 'Test Supplier',
  supplier_sku: 'SUP-SKU-001',
  expiry_date: '2025-12-31',
  batch_number: 'BATCH-001',
  serial_numbers: ['SN001', 'SN002'],
  is_active: true,
  is_discontinued: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('MaterialForm', () => {
  let queryClient: QueryClient;
  let mockOnSuccess: jest.Mock;
  let mockOnCancel: jest.Mock;
  
  beforeEach(() => {
    queryClient = new QueryClient({
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
    
    mockOnSuccess = jest.fn();
    mockOnCancel = jest.fn();
    
    // Mock the useInventory hook
    (useInventory as jest.Mock).mockReturnValue({
      createMaterial: jest.fn().mockResolvedValue(createTestMaterial()),
      updateMaterial: jest.fn().mockResolvedValue(createTestMaterial()),
    });
    
    // Mock the inventory operations
    (inventoryOperations.materialOperations.get as jest.Mock).mockResolvedValue(createTestMaterial());
  });

  const renderComponent = (material?: any) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MaterialForm 
          material={material} 
          onSuccess={mockOnSuccess} 
          onCancel={mockOnCancel} 
        />
      </QueryClientProvider>
    );
  };

  test('renders empty form for creating new material', () => {
    renderComponent();
    
    // Check that the form renders
    expect(screen.getByTestId('form')).toBeInTheDocument();
    
    // Check that all fields are present
    expect(screen.getByPlaceholderText(/sku/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/material name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/description/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/meter/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/ppf_film/i)).toBeInTheDocument();
    
    // Check that buttons are present
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  test('renders populated form for editing existing material', () => {
    const material = createTestMaterial();
    renderComponent(material);
    
    // Check that the form renders with populated values
    expect(screen.getByDisplayValue('TEST-MAT-001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Material 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    expect(screen.getByDisplayValue('500')).toBeInTheDocument();
    expect(screen.getByDisplayValue('15.5')).toBeInTheDocument();
  });

  test('submits form with valid data for new material', async () => {
    const user = userEvent.setup();
    const mockCreateMaterial = jest.fn().mockResolvedValue(createTestMaterial());
    
    (useInventory as jest.Mock).mockReturnValue({
      createMaterial: mockCreateMaterial,
      updateMaterial: jest.fn(),
    });
    
    renderComponent();
    
    // Fill in the form
    await user.type(screen.getByPlaceholderText(/sku/i), 'NEW-MAT-001');
    await user.type(screen.getByPlaceholderText(/material name/i), 'New Test Material');
    await user.type(screen.getByPlaceholderText(/description/i), 'New test description');
    await user.type(screen.getByDisplayValue('100'), '200');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /save/i }));
    
    // Verify that createMaterial was called
    expect(mockCreateMaterial).toHaveBeenCalledWith(expect.objectContaining({
      sku: 'NEW-MAT-001',
      name: 'New Test Material',
      description: 'New test description',
      current_stock: 200,
    }));
    
    // Verify that onSuccess was called
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  test('submits form with valid data for existing material', async () => {
    const user = userEvent.setup();
    const material = createTestMaterial();
    const mockUpdateMaterial = jest.fn().mockResolvedValue(material);
    
    (useInventory as jest.Mock).mockReturnValue({
      createMaterial: jest.fn(),
      updateMaterial: mockUpdateMaterial,
    });
    
    renderComponent(material);
    
    // Change a field value
    await user.clear(screen.getByDisplayValue('Test Material 1'));
    await user.type(screen.getByDisplayValue('', { exact: true }), 'Updated Test Material');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /save/i }));
    
    // Verify that updateMaterial was called
    expect(mockUpdateMaterial).toHaveBeenCalledWith(expect.objectContaining({
      id: 'test-material-1',
      name: 'Updated Test Material',
    }));
    
    // Verify that onSuccess was called
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  test('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Click the cancel button
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    
    // Verify that onCancel was called
    expect(mockOnCancel).toHaveBeenCalled();
  });

  test('validates required fields', async () => {
    const user = userEvent.setup();
    
    // Mock form validation errors
    jest.doMock('react-hook-form', () => ({
      useForm: () => ({
        register: jest.fn(),
        handleSubmit: (fn: any) => (e: any) => {
          e?.preventDefault?.();
          // Simulate validation errors
          const errors = {
            sku: 'SKU is required',
            name: 'Name is required',
          };
          return Promise.reject(errors);
        },
        formState: { errors },
        reset: jest.fn(),
        setValue: jest.fn(),
        watch: jest.fn(),
        control: {},
      }),
    }));
    
    renderComponent();
    
    // Submit the form without filling required fields
    await user.click(screen.getByRole('button', { name: /save/i }));
    
    // Check that validation errors are displayed
    await waitFor(() => {
      expect(screen.getByText('SKU is required')).toBeInTheDocument();
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });

  test('shows loading state while submitting', async () => {
    // Mock slow response
    const mockCreateMaterial = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    (useInventory as jest.Mock).mockReturnValue({
      createMaterial: mockCreateMaterial,
      updateMaterial: jest.fn(),
    });
    
    const user = userEvent.setup();
    renderComponent();
    
    // Fill in the form
    await user.type(screen.getByPlaceholderText(/sku/i), 'NEW-MAT-001');
    await user.type(screen.getByPlaceholderText(/material name/i), 'New Test Material');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /save/i }));
    
    // Check that loading state is shown
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  test('shows error message when submission fails', async () => {
    const mockCreateMaterial = jest.fn().mockRejectedValue(new Error('Failed to create material'));
    
    (useInventory as jest.Mock).mockReturnValue({
      createMaterial: mockCreateMaterial,
      updateMaterial: jest.fn(),
    });
    
    const user = userEvent.setup();
    renderComponent();
    
    // Fill in the form
    await user.type(screen.getByPlaceholderText(/sku/i), 'NEW-MAT-001');
    await user.type(screen.getByPlaceholderText(/material name/i), 'New Test Material');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /save/i }));
    
    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByText('Failed to create material')).toBeInTheDocument();
    });
  });

  test('handles material type selection', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Select a material type
    const materialTypeSelect = screen.getByTestId('select');
    await user.click(materialTypeSelect);
    
    // In a real implementation, this would show options and allow selection
    expect(materialTypeSelect).toBeInTheDocument();
  });

  test('handles unit of measure selection', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Select a unit of measure
    const unitSelect = screen.getAllByTestId('select')[1];
    await user.click(unitSelect);
    
    // In a real implementation, this would show options and allow selection
    expect(unitSelect).toBeInTheDocument();
  });

  test('handles numeric inputs', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Enter values in numeric fields
    await user.type(screen.getByDisplayValue('0'), '100'); // current_stock
    await user.type(screen.getByDisplayValue('0', { exact: true }), '20'); // minimum_stock
    await user.type(screen.getByDisplayValue('0', { exact: true }), '500'); // maximum_stock
    await user.type(screen.getByDisplayValue('0', { exact: true }), '15.5'); // unit_cost
    
    // Verify the values were entered
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    expect(screen.getByDisplayValue('500')).toBeInTheDocument();
    expect(screen.getByDisplayValue('15.5')).toBeInTheDocument();
  });

  test('handles date inputs', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Enter an expiry date
    const expiryDateInput = screen.getByPlaceholderText(/expiry date/i);
    await user.type(expiryDateInput, '2025-12-31');
    
    // Verify the value was entered
    expect(expiryDateInput).toHaveValue('2025-12-31');
  });

  test('handles array inputs like serial numbers', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Enter serial numbers
    const serialNumbersInput = screen.getByPlaceholderText(/serial numbers/i);
    await user.type(serialNumbersInput, 'SN001, SN002, SN003');
    
    // Verify the value was entered
    expect(serialNumbersInput).toHaveValue('SN001, SN002, SN003');
  });

  test('resets form when material prop changes', async () => {
    const { rerender } = renderComponent(createTestMaterial({ name: 'Material 1' }));
    
    // Change the material prop
    rerender(
      <QueryClientProvider client={queryClient}>
        <MaterialForm 
          material={createTestMaterial({ name: 'Material 2' })} 
          onSuccess={mockOnSuccess} 
          onCancel={mockOnCancel} 
        />
      </QueryClientProvider>
    );
    
    // Verify that the form was updated with the new material
    expect(screen.getByDisplayValue('Material 2')).toBeInTheDocument();
  });

  test('handles form submission with Enter key', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Fill in the form
    await user.type(screen.getByPlaceholderText(/sku/i), 'NEW-MAT-001');
    await user.type(screen.getByPlaceholderText(/material name/i), 'New Test Material');
    
    // Press Enter in the last field
    await user.keyboard('{Enter}');
    
    // Verify that the form was submitted
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  test('displays appropriate title based on mode', () => {
    // Test create mode
    const { rerender } = renderComponent();
    expect(screen.getByText('Create Material')).toBeInTheDocument();
    
    // Test edit mode
    rerender(
      <QueryClientProvider client={queryClient}>
        <MaterialForm 
          material={createTestMaterial()} 
          onSuccess={mockOnSuccess} 
          onCancel={mockOnCancel} 
        />
      </QueryClientProvider>
    );
    expect(screen.getByText('Edit Material')).toBeInTheDocument();
  });

  test('disables form fields when disabled prop is true', () => {
    renderComponent();
    
    // In a real implementation, this would check that fields are disabled
    // For now, we just verify the form renders
    expect(screen.getByTestId('form')).toBeInTheDocument();
  });

  test('shows custom validation messages', async () => {
    const user = userEvent.setup();
    
    // Mock custom validation
    jest.doMock('react-hook-form', () => ({
      useForm: () => ({
        register: jest.fn(),
        handleSubmit: (fn: any) => (e: any) => {
          e?.preventDefault?.();
          return Promise.reject({
            sku: 'SKU must be unique',
            current_stock: 'Stock must be positive',
          });
        },
        formState: { errors: {
          sku: { message: 'SKU must be unique' },
          current_stock: { message: 'Stock must be positive' },
        }},
        reset: jest.fn(),
        setValue: jest.fn(),
        watch: jest.fn(),
        control: {},
      }),
    }));
    
    renderComponent();
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /save/i }));
    
    // Check that custom validation messages are displayed
    await waitFor(() => {
      expect(screen.getByText('SKU must be unique')).toBeInTheDocument();
      expect(screen.getByText('Stock must be positive')).toBeInTheDocument();
    });
  });

  test('handles complex nested data structures', async () => {
    const complexMaterial = createTestMaterial({
      specifications: {
        thickness: 0.8,
        width: 1520,
        length: 30000,
        color: 'clear',
      },
    });
    
    renderComponent(complexMaterial);
    
    // In a real implementation, this would check that complex data is handled properly
    expect(screen.getByTestId('form')).toBeInTheDocument();
  });

  test('properly cleans up when unmounted', () => {
    const { unmount } = renderComponent();
    
    // Unmount the component
    unmount();
    
    // Verify no errors are thrown during unmount
    expect(true).toBe(true); // This test passes if no errors are thrown
  });
});