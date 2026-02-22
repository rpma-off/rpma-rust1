'use client';

import { createContext, useContext } from 'react';

export const securityContext = createContext(null as any);

export function securityProvider({ children }: { children: React.ReactNode }) {
  return <securityContext.Provider value={null}>{children}</securityContext.Provider>;
}
