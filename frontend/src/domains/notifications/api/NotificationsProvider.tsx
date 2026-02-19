'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { notificationService } from '../server';

interface NotificationsContextValue {
  notificationService: typeof notificationService;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const value = useMemo<NotificationsContextValue>(
    () => ({
      notificationService,
    }),
    []
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotificationsContext must be used within NotificationsProvider');
  }
  return context;
}
