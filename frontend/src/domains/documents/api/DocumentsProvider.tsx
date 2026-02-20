'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { DocumentsDomainContextValue } from './types';

const DocumentsDomainContext = createContext<DocumentsDomainContextValue | null>(null);

export function DocumentsProvider({ children }: { children: ReactNode }) {
  const value = useMemo<DocumentsDomainContextValue>(() => ({ domain: 'documents' }), []);
  return <DocumentsDomainContext.Provider value={value}>{children}</DocumentsDomainContext.Provider>;
}

export function useDocumentsDomainContext(): DocumentsDomainContextValue {
  const context = useContext(DocumentsDomainContext);
  if (!context) {
    throw new Error('useDocumentsDomainContext must be used within DocumentsProvider');
  }
  return context;
}
