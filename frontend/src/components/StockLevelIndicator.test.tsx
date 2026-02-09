import React from 'react';
import { render, screen } from '@testing-library/react';
import { StockLevelIndicator } from '@/components/StockLevelIndicator';
import { Material, MaterialType } from '@/lib/inventory';

// Mock the UI components
jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, max }: any) => (
    <div data-testid="progress" data-value={value} data-max={max}>
      {Math.round((value / max) * 100)}%
    </div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => (
    <div data-testid="badge" data-variant={variant}>
      {children}
    </div>
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

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="tooltip-provider">{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="tooltip">{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="tooltip-trigger">{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="tooltip-content">{children}</div>,
}));

jest.mock('lucide-react', () => ({
  AlertTriangle: ({ className }: any) => 
    <div data-testid="alert-triangle-icon" className={className} />,
  CheckCircle: ({ className }: any) => 
    <div data-testid="check-circle-icon" className={className} />,
  XCircle: ({ className }: any) => 
    <div data-testid="x-circle-icon" className={className} />,
  TrendingUp: ({ className }: any) => 
    <div data-testid="trending-up-icon" className={className} />,
  TrendingDown: ({ className }: any) => 
    <div data-testid="trending-down-icon" className={className} />,
  Minus: ({ className }: any) => 
    <div data-testid="minus-icon" className={className} />,
}));

const createTestMaterial = (overrides = {}): Material => ({
  id: 'test-material-1',
  sku: 'TEST-MAT-001',
  name: 'Test Material 1',
  description: 'Test description',
  material_type: 'ppf_film' as MaterialType,
  category: 'Films',
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
  ...overrides,
});

describe('StockLevelIndicator', () => {
  test('renders optimal stock level', () => {
    const material = createTestMaterial({
      current_stock: 100,
      minimum_stock: 20,
      maximum_stock: 200,
    });

    render(<StockLevelIndicator material={material} />);

    // Check for optimal status indicator
    expect(screen.getByText('Optimal')).toBeInTheDocument();
    expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'success');
    
    // Check for stock percentage
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  test('renders low stock level', () => {
    const material = createTestMaterial({
      current_stock: 10,
      minimum_stock: 20,
      maximum_stock: 200,
      is_low_stock: true,
    });

    render(<StockLevelIndicator material={material} />);

    // Check for low stock status indicator
    expect(screen.getByText('Low Stock')).toBeInTheDocument();
    expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'warning');
    
    // Check for stock percentage
    expect(screen.getByText('5%')).toBeInTheDocument();
  });

  test('renders out of stock', () => {
    const material = createTestMaterial({
      current_stock: 0,
      minimum_stock: 20,
      maximum_stock: 200,
    });

    render(<StockLevelIndicator material={material} />);

    // Check for out of stock status indicator
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'destructive');
    
    // Check for stock percentage
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  test('renders high stock level', () => {
    const material = createTestMaterial({
      current_stock: 190,
      minimum_stock: 20,
      maximum_stock: 200,
    });

    render(<StockLevelIndicator material={material} />);

    // Check for high stock status indicator
    expect(screen.getByText('High Stock')).toBeInTheDocument();
    expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'secondary');
    
    // Check for stock percentage
    expect(screen.getByText('95%')).toBeInTheDocument();
  });

  test('renders expired material', () => {
    const material = createTestMaterial({
      current_stock: 50,
      minimum_stock: 20,
      maximum_stock: 200,
      is_expired: true,
    });

    render(<StockLevelIndicator material={material} />);

    // Check for expired status indicator
    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'destructive');
  });

  test('renders discontinued material', () => {
    const material = createTestMaterial({
      current_stock: 50,
      minimum_stock: 20,
      maximum_stock: 200,
      is_discontinued: true,
    });

    render(<StockLevelIndicator material={material} />);

    // Check for discontinued status indicator
    expect(screen.getByText('Discontinued')).toBeInTheDocument();
    expect(screen.getByTestId('minus-icon')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'secondary');
  });

  test('prioritizes expired status over low stock', () => {
    const material = createTestMaterial({
      current_stock: 10,
      minimum_stock: 20,
      maximum_stock: 200,
      is_low_stock: true,
      is_expired: true,
    });

    render(<StockLevelIndicator material={material} />);

    // Check that expired status takes precedence
    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(screen.queryByText('Low Stock')).not.toBeInTheDocument();
    expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'destructive');
  });

  test('prioritizes out of stock over expired', () => {
    const material = createTestMaterial({
      current_stock: 0,
      minimum_stock: 20,
      maximum_stock: 200,
      is_low_stock: true,
      is_expired: true,
    });

    render(<StockLevelIndicator material={material} />);

    // Check that out of stock status takes precedence
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    expect(screen.queryByText('Expired')).not.toBeInTheDocument();
    expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'destructive');
  });

  test('renders without minimum stock', () => {
    const material = createTestMaterial({
      current_stock: 50,
      minimum_stock: null,
      maximum_stock: 200,
    });

    render(<StockLevelIndicator material={material} />);

    // Check that it still renders without minimum stock
    expect(screen.getByText('Optimal')).toBeInTheDocument();
    expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'success');
    
    // Check for stock percentage (using maximum stock as reference)
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  test('renders without maximum stock', () => {
    const material = createTestMaterial({
      current_stock: 50,
      minimum_stock: 20,
      maximum_stock: null,
    });

    render(<StockLevelIndicator material={material} />);

    // Check that it still renders without maximum stock
    expect(screen.getByText('Optimal')).toBeInTheDocument();
    expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'success');
    
    // Check that no percentage is shown when there's no maximum stock
    expect(screen.queryByText('%')).not.toBeInTheDocument();
  });

  test('renders with custom className', () => {
    const material = createTestMaterial();
    const customClass = 'custom-test-class';

    render(<StockLevelIndicator material={material} className={customClass} />);

    // Check that custom class is applied
    const card = screen.getByTestId('card');
    expect(card).toHaveClass(customClass);
  });

  test('renders with showDetails=true', () => {
    const material = createTestMaterial({
      current_stock: 75,
      minimum_stock: 25,
      maximum_stock: 150,
    });

    render(<StockLevelIndicator material={material} showDetails={true} />);

    // Check for detailed information
    expect(screen.getByText('75')).toBeInTheDocument(); // current stock
    expect(screen.getByText('25')).toBeInTheDocument(); // minimum stock
    expect(screen.getByText('50%')).toBeInTheDocument(); // percentage
  });

  test('renders with showDetails=false', () => {
    const material = createTestMaterial({
      current_stock: 75,
      minimum_stock: 25,
      maximum_stock: 150,
    });

    render(<StockLevelIndicator material={material} showDetails={false} />);

    // Check for minimal information (just status)
    expect(screen.getByText('Optimal')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument(); // current stock should still be shown
  });

  test('calculates correct percentage for various stock levels', () => {
    // Test with 25% stock
    const material25 = createTestMaterial({
      current_stock: 50,
      minimum_stock: 20,
      maximum_stock: 200,
    });

    const { rerender } = render(<StockLevelIndicator material={material25} />);
    expect(screen.getByText('25%')).toBeInTheDocument();

    // Test with 75% stock
    const material75 = createTestMaterial({
      current_stock: 150,
      minimum_stock: 20,
      maximum_stock: 200,
    });

    rerender(<StockLevelIndicator material={material75} />);
    expect(screen.getByText('75%')).toBeInTheDocument();

    // Test with 100% stock (at maximum)
    const material100 = createTestMaterial({
      current_stock: 200,
      minimum_stock: 20,
      maximum_stock: 200,
    });

    rerender(<StockLevelIndicator material={material100} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  test('handles edge case of zero maximum stock', () => {
    const material = createTestMaterial({
      current_stock: 0,
      minimum_stock: 0,
      maximum_stock: 0,
    });

    render(<StockLevelIndicator material={material} />);

    // Check that it handles zero values gracefully
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    expect(screen.queryByText('%')).not.toBeInTheDocument();
  });

  test('handles negative stock values', () => {
    const material = createTestMaterial({
      current_stock: -10,
      minimum_stock: 20,
      maximum_stock: 200,
    });

    render(<StockLevelIndicator material={material} />);

    // Check that negative values are handled
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    expect(screen.getByText('-10')).toBeInTheDocument();
  });

  test('reorders status based on priority', () => {
    // Test all status combinations to ensure correct priority
    const testCases = [
      {
        name: 'Out of Stock > Expired > Discontinued > Low Stock > High Stock > Optimal',
        material: createTestMaterial({
          current_stock: 0,
          is_expired: true,
          is_discontinued: true,
          is_low_stock: true,
        }),
        expectedStatus: 'Out of Stock',
      },
      {
        name: 'Expired > Discontinued > Low Stock > High Stock > Optimal',
        material: createTestMaterial({
          current_stock: 10,
          is_expired: true,
          is_discontinued: true,
          is_low_stock: true,
        }),
        expectedStatus: 'Expired',
      },
      {
        name: 'Discontinued > Low Stock > High Stock > Optimal',
        material: createTestMaterial({
          current_stock: 10,
          is_discontinued: true,
          is_low_stock: true,
        }),
        expectedStatus: 'Discontinued',
      },
      {
        name: 'Low Stock > High Stock > Optimal',
        material: createTestMaterial({
          current_stock: 10,
          minimum_stock: 20,
          maximum_stock: 200,
          is_low_stock: true,
        }),
        expectedStatus: 'Low Stock',
      },
    ];

    const { rerender } = render(<div />);

    testCases.forEach(({ name, material, expectedStatus }) => {
      rerender(<StockLevelIndicator material={material} />);
      expect(screen.getByText(expectedStatus)).toBeInTheDocument();
      console.log(`✓ ${name}: ${expectedStatus}`);
    });
  });

  test('renders with tooltip for additional context', () => {
    const material = createTestMaterial({
      current_stock: 15,
      minimum_stock: 20,
      maximum_stock: 200,
      is_low_stock: true,
    });

    render(<StockLevelIndicator material={material} />);

    // Check that tooltip components are rendered
    expect(screen.getByTestId('tooltip-provider')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip-trigger')).toBeInTheDocument();
  });

  test('handles very large stock numbers', () => {
    const material = createTestMaterial({
      current_stock: 1000000,
      minimum_stock: 100000,
      maximum_stock: 2000000,
    });

    render(<StockLevelIndicator material={material} />);

    // Check that large numbers are handled
    expect(screen.getByText('High Stock')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  test('handles decimal stock values', () => {
    const material = createTestMaterial({
      current_stock: 75.5,
      minimum_stock: 20.0,
      maximum_stock: 200.0,
    });

    render(<StockLevelIndicator material={material} />);

    // Check that decimal values are handled
    expect(screen.getByText('Optimal')).toBeInTheDocument();
    // The progress component rounds to nearest integer
    expect(screen.getByText('38%')).toBeInTheDocument();
  });

  test('renders correctly when minimum stock is higher than current stock', () => {
    const material = createTestMaterial({
      current_stock: 15,
      minimum_stock: 50,
      maximum_stock: 200,
    });

    render(<StockLevelIndicator material={material} />);

    // Check that it shows low stock
    expect(screen.getByText('Low Stock')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  test('renders correctly when minimum stock equals maximum stock', () => {
    const material = createTestMaterial({
      current_stock: 50,
      minimum_stock: 50,
      maximum_stock: 50,
    });

    render(<StockLevelIndicator material={material} />);

    // Check that it handles this edge case
    expect(screen.getByText('High Stock')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});