import React from 'react';
import { render, screen } from '@testing-library/react';
import { QuoteStatusBadge, STATUS_LABELS } from '../components/QuoteStatusBadge';
import type { QuoteStatus } from '@/types/quote.types';

jest.mock('lucide-react', () => ({
  FileText: ({ className }: { className?: string }) => (
    <span data-testid="icon-draft" className={className} />
  ),
  Send: ({ className }: { className?: string }) => (
    <span data-testid="icon-sent" className={className} />
  ),
  CheckCircle: ({ className }: { className?: string }) => (
    <span data-testid="icon-accepted" className={className} />
  ),
  XCircle: ({ className }: { className?: string }) => (
    <span data-testid="icon-rejected" className={className} />
  ),
  Clock: ({ className }: { className?: string }) => (
    <span data-testid="icon-expired" className={className} />
  ),
}));

const statuses: QuoteStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'expired'];

describe('QuoteStatusBadge', () => {
  it.each(statuses)('renders label for status "%s"', status => {
    render(<QuoteStatusBadge status={status} />);
    expect(screen.getByText(STATUS_LABELS[status])).toBeInTheDocument();
  });

  it('shows icon by default', () => {
    render(<QuoteStatusBadge status="draft" />);
    expect(screen.getByTestId('icon-draft')).toBeInTheDocument();
  });

  it('hides icon when showIcon is false', () => {
    render(<QuoteStatusBadge status="draft" showIcon={false} />);
    expect(screen.queryByTestId('icon-draft')).not.toBeInTheDocument();
  });

  it('applies accepted color class', () => {
    const { container } = render(<QuoteStatusBadge status="accepted" />);
    expect(container.firstChild).toHaveClass('bg-green-100');
  });

  it('applies rejected color class', () => {
    const { container } = render(<QuoteStatusBadge status="rejected" />);
    expect(container.firstChild).toHaveClass('bg-red-100');
  });
});
