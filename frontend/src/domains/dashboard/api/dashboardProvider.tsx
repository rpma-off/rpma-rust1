'use client';

import { createContext } from 'react';

export const dashboardContext = createContext(null as any);

export function dashboardProvider({ children }: { children: React.ReactNode }) {
  return <dashboardContext.Provider value={null}>{children}</dashboardContext.Provider>;
}
