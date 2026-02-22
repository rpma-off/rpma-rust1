'use client';

import { createContext, useContext } from 'react';

export const photosContext = createContext(null as any);

export function photosProvider({ children }: { children: React.ReactNode }) {
  return <photosContext.Provider value={null}>{children}</photosContext.Provider>;
}
