'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useClients } from '../hooks/useClients';
import { useClientStats } from '../hooks/useClientStats';

interface ClientsContextValue {
  clientsState: ReturnType<typeof useClients>;
  statsState: ReturnType<typeof useClientStats>;
}

const ClientsContext = createContext<ClientsContextValue | null>(null);

export function ClientsProvider({ children }: { children: ReactNode }) {
  const clientsState = useClients();
  const statsState = useClientStats();

  const value = useMemo<ClientsContextValue>(
    () => ({
      clientsState,
      statsState,
    }),
    [clientsState, statsState]
  );

  return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>;
}

export function useClientsContext(): ClientsContextValue {
  const context = useContext(ClientsContext);
  if (!context) {
    throw new Error('useClientsContext must be used within ClientsProvider');
  }
  return context;
}
