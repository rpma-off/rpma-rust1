'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { QuotesDomainContextValue } from './types';

const QuotesDomainContext = createContext<QuotesDomainContextValue | null>(null);

export function QuotesProvider({ children }: { children: ReactNode }) {
  const value = useMemo<QuotesDomainContextValue>(() => ({ domain: 'quotes' }), []);
  return <QuotesDomainContext.Provider value={value}>{children}</QuotesDomainContext.Provider>;
}

export function useQuotesDomainContext(): QuotesDomainContextValue {
  const context = useContext(QuotesDomainContext);
  if (!context) {
    throw new Error('useQuotesDomainContext must be used within QuotesProvider');
  }
  return context;
}
