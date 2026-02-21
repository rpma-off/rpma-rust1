import React from 'react';
import { render, screen } from '@testing-library/react';
import { StockLevelIndicator } from '@/domains/inventory/components/StockLevelIndicator';
import { Material, MaterialType, UnitOfMeasure } from '@/shared/types';

jest.mock('lucide-react', () => ({
  AlertTriangle: ({ className }: { className?: string }) => <div data-testid="alert-triangle" className={className} />,
  CheckCircle: ({ className }: { className?: string }) => <div data-testid="check-circle" className={className} />,
  XCircle: ({ className }: { className?: string }) => <div data-testid="x-circle" className={className} />,
  TrendingUp: ({ className }: { className?: string }) => <div data-testid="trending-up" className={className} />,
  TrendingDown: ({ className }: { className?: string }) => <div data-testid="trending-down" className={className} />,
  Minus: ({ className }: { className?: string }) => <div data-testid="minus" className={className} />,
}));

const createMaterial = (overrides: Partial<Material> = {}): Material => ({
  id: 'mat-1',
  sku: 'PPF-001',
  name: 'Test Material',
  description: 'Test description',
  material_type: 'ppf_film' as MaterialType,
  unit_of_measure: 'meter' as UnitOfMeasure,
  current_stock: 100,
  currency: 'EUR',
  is_active: true,
  is_discontinued: false,
  is_expired: false,
  is_low_stock: false,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  synced: true,
  ...overrides,
});

describe('StockLevelIndicator', () => {
  it('renders detailed view with stock status and thresholds', () => {
    const material = createMaterial({
      current_stock: 100,
      minimum_stock: 10,
      maximum_stock: 200,
      reorder_point: 15,
      unit_cost: 25.5,
      currency: 'EUR',
    });

    render(<StockLevelIndicator material={material} showDetails />);

    expect(screen.getByText('Stock Status: Test Material')).toBeInTheDocument();
    expect(screen.getByText('Optimal')).toBeInTheDocument();
    expect(screen.getByText('Min')).toBeInTheDocument();
    expect(screen.getByText('10.00')).toBeInTheDocument();
    expect(screen.getByText('Max')).toBeInTheDocument();
    expect(screen.getByText('200.00')).toBeInTheDocument();
    expect(screen.getByText('Min: 10')).toBeInTheDocument();
    expect(screen.getByText('Max: 200')).toBeInTheDocument();
    expect(screen.getByText('Reorder: 15.00')).toBeInTheDocument();
    expect(screen.getByText('Unit Cost:')).toBeInTheDocument();
    expect(screen.getByText('25.50 EUR')).toBeInTheDocument();
  });

  it('shows a low stock warning message when flagged', () => {
    const material = createMaterial({
      current_stock: 5,
      is_low_stock: true,
    });

    render(<StockLevelIndicator material={material} showDetails />);

    expect(screen.getByText('Low Stock')).toBeInTheDocument();
    expect(screen.getByText('Low stock: 5.00 meter')).toBeInTheDocument();
  });

  it('shows an expired warning message when expired', () => {
    const material = createMaterial({
      is_expired: true,
      expiry_date: '2023-01-01T00:00:00Z',
    });

    render(<StockLevelIndicator material={material} showDetails />);

    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(screen.getByText('This material has expired and should not be used')).toBeInTheDocument();
  });

  it('formats large values in compact mode', () => {
    const material = createMaterial({
      current_stock: 1500,
    });

    render(<StockLevelIndicator material={material} />);

    expect(screen.getByText('1.5k')).toBeInTheDocument();
  });
});
