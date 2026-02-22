import { render, screen } from '@testing-library/react';
import { PageSkeleton } from '@/app/PageSkeleton';
import ClientsLoading from '@/app/clients/loading';
import InterventionsLoading from '@/app/interventions/loading';

describe('route loading fallbacks', () => {
  it('renders page skeleton layout', () => {
    render(<PageSkeleton />);
    expect(screen.getByTestId('page-skeleton')).toBeInTheDocument();
  });

  it('uses the skeleton fallback for clients loading route', () => {
    render(<ClientsLoading />);
    expect(screen.getByTestId('page-skeleton')).toBeInTheDocument();
  });

  it('uses the skeleton fallback for interventions loading route', () => {
    render(<InterventionsLoading />);
    expect(screen.getByTestId('page-skeleton')).toBeInTheDocument();
  });
});
