import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuoteItemsTable } from '../components/QuoteItemsTable';
import type { QuoteItem } from '@/types/quote.types';

jest.mock('lucide-react', () => ({
  Trash2: ({ className }: { className?: string }) => (
    <span data-testid="trash-icon" className={className} />
  ),
}));

const makeItem = (overrides: Partial<QuoteItem> = {}): QuoteItem => ({
  id: 'item-1',
  quote_id: 'quote-1',
  kind: 'service',
  label: 'PPF Capot',
  description: null,
  qty: 1,
  unit_price: 15000,
  tax_rate: 20,
  material_id: null,
  position: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('QuoteItemsTable', () => {
  it('renders empty state when no items', () => {
    render(<QuoteItemsTable items={[]} />);
    expect(screen.getByText('Aucun article')).toBeInTheDocument();
  });

  it('renders item label and type', () => {
    render(<QuoteItemsTable items={[makeItem()]} />);
    expect(screen.getByText('PPF Capot')).toBeInTheDocument();
    expect(screen.getByText('Service')).toBeInTheDocument();
  });

  it('formats price in euros from cents', () => {
    render(<QuoteItemsTable items={[makeItem({ unit_price: 15000 })]} />);
    const prices = screen.getAllByText('150.00 €');
    expect(prices.length).toBeGreaterThanOrEqual(1);
  });

  it('shows delete button when editable', () => {
    render(<QuoteItemsTable items={[makeItem()]} editable />);
    expect(screen.getByRole('button', { name: /Supprimer PPF Capot/i })).toBeInTheDocument();
  });

  it('hides delete button when not editable', () => {
    render(<QuoteItemsTable items={[makeItem()]} editable={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onDeleteItem when delete button clicked', () => {
    const onDelete = jest.fn();
    render(<QuoteItemsTable items={[makeItem({ id: 'item-42' })]} editable onDeleteItem={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: /Supprimer PPF Capot/i }));
    expect(onDelete).toHaveBeenCalledWith('item-42');
  });

  it('renders labor kind label', () => {
    render(<QuoteItemsTable items={[makeItem({ kind: 'labor', label: 'Pose' })]} />);
    expect(screen.getByText("Main d'œuvre")).toBeInTheDocument();
  });

  it('renders discount kind label', () => {
    render(<QuoteItemsTable items={[makeItem({ kind: 'discount', label: 'Remise 10%' })]} />);
    expect(screen.getByText('Remise')).toBeInTheDocument();
  });
});
