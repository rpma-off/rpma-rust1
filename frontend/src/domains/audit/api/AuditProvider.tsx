'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { changeLogService } from '../server';

interface AuditContextValue {
  changeLogService: typeof changeLogService;
}

const AuditContext = createContext<AuditContextValue | null>(null);

export function AuditProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuditContextValue>(
    () => ({
      changeLogService,
    }),
    []
  );

  return <AuditContext.Provider value={value}>{children}</AuditContext.Provider>;
}

export function useAuditContext(): AuditContextValue {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error('useAuditContext must be used within AuditProvider');
  }
  return context;
}
