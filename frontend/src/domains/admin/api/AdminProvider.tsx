'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { configurationService } from '../server';
import { useSystemHealth, type UseSystemHealthReturn } from '../hooks/useSystemHealth';

interface AdminContextValue {
  configurationService: typeof configurationService;
  health: UseSystemHealthReturn;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const health = useSystemHealth();

  const value = useMemo<AdminContextValue>(
    () => ({
      configurationService,
      health,
    }),
    [health]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminContext(): AdminContextValue {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminContext must be used within AdminProvider');
  }
  return context;
}
