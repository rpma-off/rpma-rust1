'use client';

import { createContext, useContext } from 'react';

export const UiContext = createContext(null as any);

export function UiProvider({ children }: { children: React.ReactNode }) {
  return <UiContext.Provider value={null}>{children}</UiContext.Provider>;
}
