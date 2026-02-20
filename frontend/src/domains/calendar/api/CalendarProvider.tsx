'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { CalendarDomainContextValue } from './types';

const CalendarDomainContext = createContext<CalendarDomainContextValue | null>(null);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const value = useMemo<CalendarDomainContextValue>(
    () => ({ domain: 'calendar', defaultView: 'month' }),
    []
  );
  return <CalendarDomainContext.Provider value={value}>{children}</CalendarDomainContext.Provider>;
}

export function useCalendarDomainContext(): CalendarDomainContextValue {
  const context = useContext(CalendarDomainContext);
  if (!context) {
    throw new Error('useCalendarDomainContext must be used within CalendarProvider');
  }
  return context;
}
