'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useUsers } from './useUsers';
import { useUserActions } from './useUserActions';

interface UsersContextValue {
  usersState: ReturnType<typeof useUsers>;
  actions: ReturnType<typeof useUserActions>;
}

const UsersContext = createContext<UsersContextValue | null>(null);

export function UsersProvider({ children }: { children: ReactNode }) {
  const usersState = useUsers();
  const actions = useUserActions();

  const value = useMemo<UsersContextValue>(
    () => ({
      usersState,
      actions,
    }),
    [usersState, actions]
  );

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}

export function useUsersContext(): UsersContextValue {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error('useUsersContext must be used within UsersProvider');
  }
  return context;
}
