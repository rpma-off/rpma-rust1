'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { SyncDomainContextValue } from './types';

const SyncDomainContext = createContext<SyncDomainContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const value = useMemo<SyncDomainContextValue>(() => ({ domain: 'sync' }), []);
  return <SyncDomainContext.Provider value={value}>{children}</SyncDomainContext.Provider>;
}

export function useSyncDomainContext(): SyncDomainContextValue {
  const context = useContext(SyncDomainContext);
  if (!context) {
    throw new Error('useSyncDomainContext must be used within SyncProvider');
  }
  return context;
}
