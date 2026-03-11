import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Quote } from '@/types/quote.types';
import { QuotesListTable } from '../components/QuotesListTable';

jest.mock('../components/QuoteStatusBadge', () => ({
  QuoteStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

jest.mock('@/components/ui/virtualized-table', () => ({
  VirtualizedTable: ({ data }: { data: unknown[] }) => (
    <div data-testid="virtualized-table">{data.length}</div>
  ),
}));

const makeQuote = (index: number): Quote & { client?: { name: string } } => ({
  id: `quote-${index}`,
  quote_number: `DEV-${String(index).padStart(4, '0')}`,
  client_id: `client-${index}`,
  task_id: null,
  status: 'draft',
  valid_until: null,
  description: `Quote ${index}`,
  notes: null,
  terms: null,
  subtotal: 10000,
  tax_total: 2000,
  total: 12000,
  discount_type: null,
  discount_value: null,
  discount_amount: null,
  vehicle_plate: `AA-${index}`,
  vehicle_make: 'Tesla',
  vehicle_model: 'Model 3',
  vehicle_year: '2024',
  vehicle_vin: `VIN-${index}`,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: null,
  items: [],
  client: { name: `Client ${index}` },
});

describe('QuotesListTable', () => {
  it('renders the standard table for 50 quotes or fewer', () => {
    render(
      <QuotesListTable
        quotes={Array.from({ length: 50 }, (_, index) => makeQuote(index))}
      />
    );

    expect(screen.queryByTestId('virtualized-table')).not.toBeInTheDocument();
    expect(screen.getByText('DEV-0000')).toBeInTheDocument();
    expect(screen.getByText('Quote 0')).toBeInTheDocument();
  });

  it('switches to virtualization when more than 50 quotes are rendered', () => {
    render(
      <QuotesListTable
        quotes={Array.from({ length: 51 }, (_, index) => makeQuote(index))}
      />
    );

    expect(screen.getByTestId('virtualized-table')).toHaveTextContent('51');
  });
});
