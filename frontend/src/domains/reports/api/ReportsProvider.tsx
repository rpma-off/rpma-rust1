'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { reportsService, reportOperations } from '../server';

interface ReportsContextValue {
  reportsService: typeof reportsService;
  reportOperations: typeof reportOperations;
}

const ReportsContext = createContext<ReportsContextValue | null>(null);

export function ReportsProvider({ children }: { children: ReactNode }) {
  const value = useMemo<ReportsContextValue>(
    () => ({
      reportsService,
      reportOperations,
    }),
    []
  );

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}

export function useReportsContext(): ReportsContextValue {
  const context = useContext(ReportsContext);
  if (!context) {
    throw new Error('useReportsContext must be used within ReportsProvider');
  }
  return context;
}
