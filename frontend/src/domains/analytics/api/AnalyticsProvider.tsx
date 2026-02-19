'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { analyticsService, dashboardApiService } from '../server';

interface AnalyticsContextValue {
  analyticsService: typeof analyticsService;
  dashboardApiService: typeof dashboardApiService;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AnalyticsContextValue>(
    () => ({
      analyticsService,
      dashboardApiService,
    }),
    []
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalyticsContext(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalyticsContext must be used within AnalyticsProvider');
  }
  return context;
}
