'use client';

import { useCallback } from 'react';
import { ipcClient } from '@/lib/ipc';
import type { UpdateUserRequest, UserAccount } from '@/lib/backend';
import { useAuth } from '@/shared/hooks/useAuth';
import type { UseUserActionsResult } from './types';

export function useUserActions(): UseUserActionsResult {
  const { user } = useAuth();

  const createUser = useCallback(
    async (payload: {
      email: string;
      first_name: string;
      last_name: string;
      role: string;
      password: string;
    }) => {
      if (!user?.token) return false;
      const response = await ipcClient.users.create(payload);
      return response !== null;
    },
    [user?.token]
  );

  const updateUser = useCallback(
    async (id: string, updates: Partial<UserAccount>) => {
      if (!user?.token) return false;
      const response = await ipcClient.users.update(id, updates as unknown as UpdateUserRequest);
      return response !== null;
    },
    [user?.token]
  );

  const deleteUser = useCallback(async (id: string) => {
    if (!user?.token) return false;
    const response = await ipcClient.users.delete(id);
    return response !== null;
  }, [user?.token]);

  const banUser = useCallback(async (id: string) => {
    if (!user?.token) return false;
    const response = await ipcClient.users.banUser(id);
    return response !== null;
  }, [user?.token]);

  const unbanUser = useCallback(async (id: string) => {
    if (!user?.token) return false;
    const response = await ipcClient.users.unbanUser(id);
    return response !== null;
  }, [user?.token]);

  const changeRole = useCallback(async (id: string, role: string) => {
    if (!user?.token) return false;
    const response = await ipcClient.users.changeRole(id, role);
    return response !== null;
  }, [user?.token]);

  return {
    createUser,
    updateUser,
    deleteUser,
    banUser,
    unbanUser,
    changeRole,
  };
}
