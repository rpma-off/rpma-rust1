import React from 'react';
import { render, screen } from '@testing-library/react';
import { StockLevelIndicator } from './StockLevelIndicator';
import { Material, MaterialType, UnitOfMeasure } from '@/lib/inventory';

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('lucide-react', () => ({
  AlertTriangle: ({ className }: { className?: string }) => <div data-testid="alert-triangle-icon" className={className} />,
  CheckCircle: ({ className }: { className?: string }) => <div data-testid="check-circle-icon" className={className} />,
  XCircle: ({ className }: { className?: string }) => <div data-testid="x-circle-icon" className={className} />,
  TrendingUp: ({ className }: { className?: string }) => <div data-testid="trending-up-icon" className={className} />,
  Minus: ({ className }: { className?: string }) => <div data-testid="minus-icon" className={className} />,
}));

const createMaterial = (overrides: Partial<Material> = {}): Material => ({
  id: 'mat-1',
  sku: 'MAT-001',
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
  it('renders compact view with stock value and status icon', () => {
    const material = createMaterial({ current_stock: 75 });
    render(<StockLevelIndicator material={material} />);

    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
  });

  it('renders expired status in compact view', () => {
    const material = createMaterial({ is_expired: true, current_stock: 10 });
    render(<StockLevelIndicator material={material} />);

    expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();
  });

  it('renders detailed view with status text', () => {
    const material = createMaterial({ is_low_stock: true, current_stock: 5, minimum_stock: 20 });
    render(<StockLevelIndicator material={material} showDetails={true} />);

    expect(screen.getByText('Stock Status: Test Material')).toBeInTheDocument();
    expect(screen.getByText('Low Stock')).toBeInTheDocument();
  });
});
