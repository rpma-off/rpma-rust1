'use client';

import { createContext, useContext } from 'react';

export const performanceContext = createContext(null as any);

export function performanceProvider({ children }: { children: React.ReactNode }) {
  return <performanceContext.Provider value={null}>{children}</performanceContext.Provider>;
}
