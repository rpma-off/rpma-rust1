'use client';

import React, { createContext, useContext } from 'react';
import { useInventory } from '../hooks/useInventory';
import type { InventoryQuery } from '../hooks/useInventory';

type InventoryContextValue = ReturnType<typeof useInventory>;

const InventoryContext = createContext<InventoryContextValue | undefined>(undefined);

interface InventoryProviderProps {
  children: React.ReactNode;
  query?: InventoryQuery;
}

export function InventoryProvider({ children, query }: InventoryProviderProps) {
  const value = useInventory(query);

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventoryContext(): InventoryContextValue {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventoryContext must be used within an InventoryProvider');
  }
  return context;
}
