import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InventoryManager } from '../InventoryManager';
import { mockIPC } from '@tauri-apps/api/mocks';

// Mock the IPC calls
const mockGetInventoryItems = jest.fn();
const mockUpdateStock = jest.fn();
const mockCreateAdjustment = jest.fn();

// Setup IPC mocks
beforeEach(() => {
  mockIPC((cmd, args) => {
    if (cmd === 'get_inventory_items') {
      return mockGetInventoryItems(args);
    }
    if (cmd === 'update_stock') {
      return mockUpdateStock(args);
    }
    if (cmd === 'create_stock_adjustment') {
      return mockCreateAdjustment(args);
    }
  });
});

// Helper to render component with providers
const renderInventoryManager = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <InventoryManager />
    </QueryClientProvider>
  );
};

describe('InventoryManager Error Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('displays error message when inventory items fail to load', async () => {
    // Mock error response
    mockGetInventoryItems.mockRejectedValue(new Error('Network error'));

    renderInventoryManager();

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/failed to load inventory/i)).toBeInTheDocument();
    });
  });

  test('shows validation error for negative stock update', async () => {
    // Mock initial data
    mockGetInventoryItems.mockResolvedValue({
      success: true,
      data: [
        {
          id: '1',
          material_id: 'mat-1',
          material_name: 'Test Film',
          quantity_on_hand: 100,
          unit_of_measure: 'm2',
        },
      ],
    });

    // Mock failed update due to validation
    mockUpdateStock.mockRejectedValue(new Error('Stock cannot be negative'));

    renderInventoryManager();

    // Wait for items to load
    await waitFor(() => {
      expect(screen.getByText('Test Film')).toBeInTheDocument();
    });

    // Try to update with negative quantity
    const updateButton = screen.getByRole('button', { name: /update stock/i });
    fireEvent.click(updateButton);

    const quantityInput = screen.getByLabelText(/quantity/i);
    fireEvent.change(quantityInput, { target: { value: '-50' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    // Check for validation error
    await waitFor(() => {
      expect(screen.getByText(/stock cannot be negative/i)).toBeInTheDocument();
    });
  });

  test('handles insufficient stock error for stock out', async () => {
    // Mock initial data
    mockGetInventoryItems.mockResolvedValue({
      success: true,
      data: [
        {
          id: '1',
          material_id: 'mat-1',
          material_name: 'Test Film',
          quantity_on_hand: 10,
          quantity_available: 10,
          unit_of_measure: 'm2',
        },
      ],
    });

    // Mock error for insufficient stock
    mockUpdateStock.mockRejectedValue(new Error('Insufficient stock available'));

    renderInventoryManager();

    await waitFor(() => {
      expect(screen.getByText('Test Film')).toBeInTheDocument();
    });

    // Try to remove more than available
    const updateButton = screen.getByRole('button', { name: /update stock/i });
    fireEvent.click(updateButton);

    const quantityInput = screen.getByLabelText(/quantity/i);
    fireEvent.change(quantityInput, { target: { value: '20' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    // Check for insufficient stock error
    await waitFor(() => {
      expect(screen.getByText(/insufficient stock available/i)).toBeInTheDocument();
    });
  });

  test('displays error toast when stock adjustment fails', async () => {
    // Mock initial data
    mockGetInventoryItems.mockResolvedValue({
      success: true,
      data: [
        {
          id: '1',
          material_id: 'mat-1',
          material_name: 'Test Film',
          quantity_on_hand: 100,
          unit_of_measure: 'm2',
        },
      ],
    });

    // Mock failed adjustment
    mockCreateAdjustment.mockResolvedValue({
      success: false,
      error: 'Cannot create adjustment: Unauthorized',
    });

    renderInventoryManager();

    await waitFor(() => {
      expect(screen.getByText('Test Film')).toBeInTheDocument();
    });

    // Try to create adjustment
    const adjustButton = screen.getByRole('button', { name: /adjust stock/i });
    fireEvent.click(adjustButton);

    const reasonInput = screen.getByLabelText(/reason/i);
    fireEvent.change(reasonInput, { target: { value: 'Physical count' } });

    const adjustSaveButton = screen.getByRole('button', { name: /create adjustment/i });
    fireEvent.click(adjustSaveButton);

    // Check for error toast/notification
    await waitFor(() => {
      expect(screen.getByText(/cannot create adjustment: unauthorized/i)).toBeInTheDocument();
    });
  });

  test('handles empty inventory list gracefully', async () => {
    // Mock empty response
    mockGetInventoryItems.mockResolvedValue({
      success: true,
      data: [],
    });

    renderInventoryManager();

    // Should show empty state message
    await waitFor(() => {
      expect(screen.getByText(/no inventory items found/i)).toBeInTheDocument();
    });

    // Should offer to add new items
    expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument();
  });

  test('shows error for invalid quantity format', async () => {
    mockGetInventoryItems.mockResolvedValue({
      success: true,
      data: [
        {
          id: '1',
          material_id: 'mat-1',
          material_name: 'Test Film',
          quantity_on_hand: 100,
          unit_of_measure: 'm2',
        },
      ],
    });

    renderInventoryManager();

    await waitFor(() => {
      expect(screen.getByText('Test Film')).toBeInTheDocument();
    });

    // Try to update with invalid quantity
    const updateButton = screen.getByRole('button', { name: /update stock/i });
    fireEvent.click(updateButton);

    const quantityInput = screen.getByLabelText(/quantity/i);
    fireEvent.change(quantityInput, { target: { value: 'abc' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    // Check for validation error
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid number/i)).toBeInTheDocument();
    });
  });
});