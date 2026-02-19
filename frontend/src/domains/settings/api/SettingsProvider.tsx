'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useSettings } from './useSettings';
import { useSettingsActions } from './useSettingsActions';

interface SettingsContextValue {
  settings: ReturnType<typeof useSettings>;
  actions: ReturnType<typeof useSettingsActions>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const actions = useSettingsActions();

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      actions,
    }),
    [settings, actions]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsContext must be used within SettingsProvider');
  }
  return context;
}
