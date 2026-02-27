import React from 'react';
import { render, screen } from '@testing-library/react';
import { QuoteTotals } from '../components/QuoteTotals';

describe('QuoteTotals', () => {
  it('formats subtotal, tax and total from cents', () => {
    render(<QuoteTotals subtotal={10000} taxTotal={2000} total={12000} />);
    expect(screen.getByText(/100\.00 €/)).toBeInTheDocument();
    expect(screen.getByText('20.00 €')).toBeInTheDocument();
    expect(screen.getByText(/Total TTC:/)).toBeInTheDocument();
    expect(screen.getByText(/120\.00 €/)).toBeInTheDocument();
  });

  it('shows zero values correctly', () => {
    render(<QuoteTotals subtotal={0} taxTotal={0} total={0} />);
    const zeros = screen.getAllByText(/0\.00 €/);
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });

  it('renders section labels', () => {
    render(<QuoteTotals subtotal={0} taxTotal={0} total={0} />);
    expect(screen.getByText(/Sous-total HT/)).toBeInTheDocument();
    expect(screen.getByText(/TVA/)).toBeInTheDocument();
    expect(screen.getByText(/Total TTC/)).toBeInTheDocument();
  });
});
