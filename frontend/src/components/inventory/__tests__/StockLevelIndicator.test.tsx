import React from 'react';
import { render, screen } from '@testing-library/react';
import { StockLevelIndicator } from '../../StockLevelIndicator';
import { Material, MaterialType, UnitOfMeasure } from '@/lib/inventory';

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

describe('StockLevelIndicator (inventory)', () => {
  it('renders compact status with stock value', () => {
    const material = createMaterial({ current_stock: 42 });
    render(<StockLevelIndicator material={material} />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('renders expired status when material is expired', () => {
    const material = createMaterial({ is_expired: true });
    render(<StockLevelIndicator material={material} />);

    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('renders detailed view when showDetails is true', () => {
    const material = createMaterial({ name: 'Detail Material', current_stock: 10 });
    render(<StockLevelIndicator material={material} showDetails={true} />);

    expect(screen.getByText('Stock Status: Detail Material')).toBeInTheDocument();
    expect(screen.getByText('Unit Cost:')).toBeInTheDocument();
  });
});
