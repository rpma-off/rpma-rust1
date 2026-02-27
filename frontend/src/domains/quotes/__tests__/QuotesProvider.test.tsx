import { renderHook } from '@testing-library/react';
import { QuotesProvider, useQuotesDomainContext } from '../api/QuotesProvider';

function wrapper({ children }: { children: React.ReactNode }) {
  return <QuotesProvider>{children}</QuotesProvider>;
}

describe('QuotesProvider', () => {
  it('throws when useQuotesDomainContext is used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useQuotesDomainContext())).toThrow(
      'useQuotesDomainContext must be used within QuotesProvider',
    );
  });

  it('provides domain context value to consumers', () => {
    const { result } = renderHook(() => useQuotesDomainContext(), { wrapper });
    expect(result.current.domain).toBe('quotes');
  });
});
