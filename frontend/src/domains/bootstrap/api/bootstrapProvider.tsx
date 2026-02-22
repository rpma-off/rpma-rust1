'use client';

import { createContext, useContext } from 'react';

export const bootstrapContext = createContext(null as any);

export function bootstrapProvider({ children }: { children: React.ReactNode }) {
  return <bootstrapContext.Provider value={null}>{children}</bootstrapContext.Provider>;
}
