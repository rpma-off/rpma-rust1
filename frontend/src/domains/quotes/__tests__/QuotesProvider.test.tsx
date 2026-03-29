import React from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import { QuotesProvider, useQuotesDomainContext } from '../api/QuotesProvider';

function wrapper({ children }: { children: React.ReactNode }) {
  return <QuotesProvider>{children}</QuotesProvider>;
}

class TestErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <div data-testid="hook-error">{this.state.error.message}</div>;
    }

    return this.props.children;
  }
}

function HookConsumer() {
  useQuotesDomainContext();
  return null;
}

describe('QuotesProvider', () => {
  it('throws when useQuotesDomainContext is used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      render(
        <TestErrorBoundary>
          <HookConsumer />
        </TestErrorBoundary>,
      );

      expect(screen.getByTestId('hook-error')).toHaveTextContent(
        'useQuotesDomainContext must be used within QuotesProvider',
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it('provides domain context value to consumers', () => {
    const { result } = renderHook(() => useQuotesDomainContext(), { wrapper });
    expect(result.current.domain).toBe('quotes');
  });
});
