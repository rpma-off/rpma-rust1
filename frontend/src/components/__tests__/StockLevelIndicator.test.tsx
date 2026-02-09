import React from 'react';
import { render, screen } from '@testing-library/react';
import { StockLevelIndicator } from '../StockLevelIndicator';
import { Material, MaterialType, UnitOfMeasure } from '@/lib/inventory';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  AlertTriangle: ({ className }: { className?: string }) => <div data-testid="alert-triangle" className={className} />,
  CheckCircle: ({ className }: { className?: string }) => <div data-testid="check-circle" className={className} />,
  XCircle: ({ className }: { className?: string }) => <div data-testid="x-circle" className={className} />,
  TrendingUp: ({ className }: { className?: string }) => <div data-testid="trending-up" className={className} />,
  TrendingDown: ({ className }: { className?: string }) => <div data-testid="trending-down" className={className} />,
  Minus: ({ className }: { className?: string }) => <div data-testid="minus" className={className} />,
}));

describe('StockLevelIndicator', () => {
  const createMockMaterial = (overrides: Partial<Material> = {}): Material => ({
    ...overrides,
    // Add default values for required properties
    id: overrides.id || '1',
    sku: overrides.sku || 'TEST-001',
    name: overrides.name || 'Test Material',
    material_type: overrides.material_type || 'ppf_film',
    unit_of_measure: overrides.unit_of_measure || 'piece',
    current_stock: overrides.current_stock || 100,
    currency: overrides.currency || 'EUR',
    is_active: overrides.is_active !== false,
    is_discontinued: overrides.is_discontinued || false,
    is_expired: overrides.is_expired || false,
    is_low_stock: overrides.is_low_stock || false,
    created_at: overrides.created_at || '2023-01-01T00:00:00Z',
    updated_at: overrides.updated_at || '2023-01-01T00:00:00Z',
    synced: overrides.synced !== false,
  });
    id: '1',
    sku: 'TEST-001',
    name: 'Test Material',
    description: 'Test description',
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

  describe('compact mode (default)', () => {
    it('should render with optimal stock status', () => {
      const material = createMockMaterial({
        current_stock: 100,
        minimum_stock: 10,
        maximum_stock: 200,
      });

      render(<StockLevelIndicator material={material} />);

      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByTestId('check-circle')).toBeInTheDocument();
      expect(screen.getByText('OK')).toBeInTheDocument();
    });

    it('should render with low stock status', () => {
      const material = createMockMaterial({
        current_stock: 5,
        minimum_stock: 10,
        maximum_stock: 200,
      });

      render(<StockLevelIndicator material={material} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByTestId('alert-triangle')).toBeInTheDocument();
      expect(screen.getByText('Low Stock')).toBeInTheDocument();
    });

    it('should render with out of stock status', () => {
      const material = createMockMaterial({
        current_stock: 0,
        minimum_stock: 10,
        maximum_stock: 200,
      });

      render(<StockLevelIndicator material={material} />);

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByTestId('x-circle')).toBeInTheDocument();
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    });

    it('should render with critical status when below reorder point', () => {
      const material = createMockMaterial({
        current_stock: 5,
        minimum_stock: 20,
        reorder_point: 10,
      });

      render(<StockLevelIndicator material={material} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByTestId('alert-triangle')).toBeInTheDocument();
      expect(screen.getByText('Critical Low')).toBeInTheDocument();
    });

    it('should render with high stock status', () => {
      const material = createMockMaterial({
        current_stock: 190,
        minimum_stock: 10,
        maximum_stock: 200,
      });

      render(<StockLevelIndicator material={material} />);

      expect(screen.getByText('190')).toBeInTheDocument();
      expect(screen.getByTestId('trending-up')).toBeInTheDocument();
      expect(screen.getByText('High Stock')).toBeInTheDocument();
    });

    it('should render with expired status', () => {
      const material = createMockMaterial({
        current_stock: 100,
        minimum_stock: 10,
        maximum_stock: 200,
        expiry_date: '2023-01-01T00:00:00Z', // Past date
        is_expired: true,
      });

      render(<StockLevelIndicator material={material} />);

      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByTestId('x-circle')).toBeInTheDocument();
      expect(screen.getByText('Expired')).toBeInTheDocument();
    });

    it('should render with discontinued status', () => {
      const material = createMockMaterial({
        current_stock: 100,
        minimum_stock: 10,
        maximum_stock: 200,
        is_discontinued: true,
      });

      render(<StockLevelIndicator material={material} />);

      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByTestId('minus')).toBeInTheDocument();
      expect(screen.getByText('Discontinued')).toBeInTheDocument();
    });

    it('should format large numbers with k suffix', () => {
      const material = createMockMaterial({
        current_stock: 1500,
        minimum_stock: 100,
        maximum_stock: 2000,
      });

      render(<StockLevelIndicator material={material} />);

      expect(screen.getByText('1.5k')).toBeInTheDocument();
    });

    it('should show progress bar', () => {
      const material = createMockMaterial({
        current_stock: 100,
        minimum_stock: 10,
        maximum_stock: 200,
      });

      render(<StockLevelIndicator material={material} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveStyle('width: 50%'); // 100/200 * 100
    });

    it('should show tooltip with material information', () => {
      const material = createMockMaterial({
        current_stock: 100,
        minimum_stock: 10,
        maximum_stock: 200,
        reorder_point: 15,
        expiry_date: '2024-12-31T00:00:00Z',
      });

      render(<StockLevelIndicator material={material} />);

      // Hover to trigger tooltip
      const indicator = screen.getByText('100').parentElement?.parentElement;
      if (indicator) {
        screen.getByRole('button'); // Tooltip trigger
      }

      // Check that tooltip content exists
      expect(screen.getByText('Test Material')).toBeInTheDocument();
      expect(screen.getByText('Stock: 100 meter')).toBeInTheDocument();
      expect(screen.getByText('Status: OK')).toBeInTheDocument();
      expect(screen.getByText('Min: 10')).toBeInTheDocument();
      expect(screen.getByText('Reorder at: 15')).toBeInTheDocument();
      expect(screen.getByText('Expires: 12/31/2024')).toBeInTheDocument();
    });
  });

  describe('details mode', () => {
    it('should render detailed view with all sections', () => {
      const material = createMockMaterial({
        current_stock: 100,
        minimum_stock: 10,
        maximum_stock: 200,
        reorder_point: 15,
        unit_cost: 25.50,
        currency: 'EUR',
        supplier_name: 'Test Supplier',
        storage_location: 'Warehouse A-1',
        batch_number: 'BATCH-001',
        expiry_date: '2024-12-31T00:00:00Z',
        quality_grade: 'A',
        certification: 'ISO-9001',
      });

      render(<StockLevelIndicator material={material} showDetails={true} />);

      expect(screen.getByText('Stock Status: Test Material')).toBeInTheDocument();
      expect(screen.getByText('OK')).toBeInTheDocument();

      // Basic Information
      expect(screen.getByText('Current Stock')).toBeInTheDocument();
      expect(screen.getByText('100 meter')).toBeInTheDocument();
      expect(screen.getByText('Min: 10')).toBeInTheDocument();
      expect(screen.getByText('Max: 200')).toBeInTheDocument();
      expect(screen.getByText('Reorder: 15')).toBeInTheDocument();

      // Details
      expect(screen.getByText('Material Type:')).toBeInTheDocument();
      expect(screen.getByText('ppf film')).toBeInTheDocument();
      expect(screen.getByText('Unit Cost:')).toBeInTheDocument();
      expect(screen.getByText('€25.50')).toBeInTheDocument();
      expect(screen.getByText('Supplier:')).toBeInTheDocument();
      expect(screen.getByText('Test Supplier')).toBeInTheDocument();
      expect(screen.getByText('Location:')).toBeInTheDocument();
      expect(screen.getByText('Warehouse A-1')).toBeInTheDocument();
      expect(screen.getByText('Expiry Date:')).toBeInTheDocument();
      expect(screen.getByText('Batch:')).toBeInTheDocument();
      expect(screen.getByText('BATCH-001')).toBeInTheDocument();

      // Quality Information
      expect(screen.getByText('Quality Information')).toBeInTheDocument();
      expect(screen.getByText('Grade: A')).toBeInTheDocument();
      expect(screen.getByText('ISO-9001')).toBeInTheDocument();
    });

    it('should show warning for expiring soon materials', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15); // 15 days from now
      
      const material = createMockMaterial({
        current_stock: 100,
        minimum_stock: 10,
        maximum_stock: 200,
        expiry_date: futureDate.toISOString(),
      });

      render(<StockLevelIndicator material={material} showDetails={true} />);

      const expiryElement = screen.getByText(/Expires:/);
      expect(expiryElement.parentElement).toHaveClass('text-yellow-600');
      expect(screen.getByText(/\(15 days\)/)).toBeInTheDocument();
    });

    it('should show alert for expired materials', () => {
      const material = createMockMaterial({
        current_stock: 100,
        minimum_stock: 10,
        maximum_stock: 200,
        expiry_date: '2023-01-01T00:00:00Z',
        is_expired: true,
      });

      render(<StockLevelIndicator material={material} showDetails={true} />);

      expect(screen.getByText('This material has expired and should not be used')).toBeInTheDocument();
    });

    it('should show alert for discontinued materials', () => {
      const material = createMockMaterial({
        current_stock: 100,
        minimum_stock: 10,
        maximum_stock: 200,
        is_discontinued: true,
      });

      render(<StockLevelIndicator material={material} showDetails={true} />);

      expect(screen.getByText('This material is discontinued')).toBeInTheDocument();
    });

    it('should show alert for materials needing reorder', () => {
      const material = createMockMaterial({
        current_stock: 5,
        minimum_stock: 20,
        reorder_point: 10,
      });

      render(<StockLevelIndicator material={material} showDetails={true} />);

      expect(screen.getByText(/Reorder required: 5 meter \(below 10\)/)).toBeInTheDocument();
    });

    it('should handle missing optional fields gracefully', () => {
      const material = createMockMaterial({
        current_stock: 100,
        minimum_stock: 10,
        maximum_stock: 200,
      });

      render(<StockLevelIndicator material={material} showDetails={true} />);

      expect(screen.getByText('Unit Cost:')).toBeInTheDocument();
      expect(screen.getByText('N/A')).toBeInTheDocument();
      expect(screen.getByText('Supplier:')).toBeInTheDocument();
      expect(screen.getByText('N/A')).toBeInTheDocument();
      expect(screen.getByText('Location:')).toBeInTheDocument();
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });

    it('should not show quality section when no quality info', () => {
      const material = createMockMaterial({
        current_stock: 100,
        minimum_stock: 10,
        maximum_stock: 200,
      });

      render(<StockLevelIndicator material={material} showDetails={true} />);

      expect(screen.queryByText('Quality Information')).not.toBeInTheDocument();
    });

    it('should calculate progress without min/max stock', () => {
      const material = createMockMaterial({
        current_stock: 100,
        // No minimum_stock, maximum_stock, or reorder_point
      });

      render(<StockLevelIndicator material={material} showDetails={true} />);

      expect(screen.getByText('Current Stock')).toBeInTheDocument();
      expect(screen.getByText('100 meter')).toBeInTheDocument();
      expect(screen.queryByText('Min:')).not.toBeInTheDocument();
      expect(screen.queryByText('Max:')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle zero values', () => {
      const material = createMockMaterial({
        current_stock: 0,
        minimum_stock: 0,
        maximum_stock: 0,
        reorder_point: 0,
      });

      render(<StockLevelIndicator material={material} showDetails={true} />);

      expect(screen.getByText('0 meter')).toBeInTheDocument();
      expect(screen.getByText('Min: 0')).toBeInTheDocument();
      expect(screen.getByText('Max: 0')).toBeInTheDocument();
      expect(screen.getByText('Reorder: 0')).toBeInTheDocument();
    });

    it('should handle decimal values', () => {
      const material = createMockMaterial({
        current_stock: 99.99,
        minimum_stock: 10.5,
        maximum_stock: 200.75,
      });

      render(<StockLevelIndicator material={material} showDetails={true} />);

      expect(screen.getByText('99.99 meter')).toBeInTheDocument();
      expect(screen.getByText('Min: 10.5')).toBeInTheDocument();
      expect(screen.getByText('Max: 200.75')).toBeInTheDocument();
    });

    it('should handle very large values', () => {
      const material = createMockMaterial({
        current_stock: 999999,
        minimum_stock: 10000,
        maximum_stock: 1000000,
      });

      render(<StockLevelIndicator material={material} />);

      expect(screen.getByText('999999')).toBeInTheDocument();
    });
  });
});