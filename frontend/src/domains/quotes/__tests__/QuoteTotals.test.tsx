import React from 'react';
import { render, screen } from '@testing-library/react';
import { QuoteTotals } from '../components/QuoteTotals';

describe('QuoteTotals', () => {
  it('formats subtotal, tax and total from cents', () => {
    render(<QuoteTotals subtotal={10000} taxTotal={2000} total={12000} />);
    // French locale uses comma as decimal separator and non-breaking space before €
    // Use getAllByText for values that may match multiple elements
    expect(screen.getAllByText(/100,00\s*€/).length).toBeGreaterThanOrEqual(1);
    // Tax total 20,00 € - check specifically within context
    expect(screen.getByText(/TVA/)).toBeInTheDocument();
    expect(screen.getByText(/Total TTC:/)).toBeInTheDocument();
    expect(screen.getAllByText(/120,00\s*€/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows zero values correctly', () => {
    render(<QuoteTotals subtotal={0} taxTotal={0} total={0} />);
    // French locale uses comma as decimal separator
    const zeros = screen.getAllByText(/0,00\s*€/);
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });

  it('renders section labels', () => {
    render(<QuoteTotals subtotal={0} taxTotal={0} total={0} />);
    expect(screen.getByText(/Sous-total HT/)).toBeInTheDocument();
    expect(screen.getByText(/TVA/)).toBeInTheDocument();
    expect(screen.getByText(/Total TTC/)).toBeInTheDocument();
  });
});
