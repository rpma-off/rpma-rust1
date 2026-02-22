'use client';

import { createContext, useContext } from 'react';

export const systemContext = createContext(null as any);

export function systemProvider({ children }: { children: React.ReactNode }) {
  return <systemContext.Provider value={null}>{children}</systemContext.Provider>;
}
