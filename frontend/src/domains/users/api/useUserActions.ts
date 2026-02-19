'use client';

import { useCallback } from 'react';
import { useAuth } from '@/domains/auth';
import { ipcClient } from '@/lib/ipc';
import type { UpdateUserRequest, UserAccount } from '@/lib/backend';
import type { UseUserActionsResult } from './types';

export function useUserActions(): UseUserActionsResult {
  const { user } = useAuth();

  const withToken = useCallback(async <T>(fn: (token: string) => Promise<T>): Promise<T | null> => {
    if (!user?.token) {
      return null;
    }
    return fn(user.token);
  }, [user?.token]);

  const createUser = useCallback(
    async (payload: {
      email: string;
      first_name: string;
      last_name: string;
      role: string;
      password: string;
    }) => {
      const response = await withToken((token) => ipcClient.users.create(payload, token));
      return response !== null;
    },
    [withToken]
  );

  const updateUser = useCallback(
    async (id: string, updates: Partial<UserAccount>) => {
      const response = await withToken((token) =>
        ipcClient.users.update(id, updates as unknown as UpdateUserRequest, token)
      );
      return response !== null;
    },
    [withToken]
  );

  const deleteUser = useCallback(async (id: string) => {
    const response = await withToken((token) => ipcClient.users.delete(id, token));
    return response !== null;
  }, [withToken]);

  const banUser = useCallback(async (id: string) => {
    const response = await withToken((token) => ipcClient.users.banUser(id, token));
    return response !== null;
  }, [withToken]);

  const unbanUser = useCallback(async (id: string) => {
    const response = await withToken((token) => ipcClient.users.unbanUser(id, token));
    return response !== null;
  }, [withToken]);

  const changeRole = useCallback(async (id: string, role: string) => {
    const response = await withToken((token) =>
      ipcClient.users.changeRole(id, role, token)
    );
    return response !== null;
  }, [withToken]);

  return {
    createUser,
    updateUser,
    deleteUser,
    banUser,
    unbanUser,
    changeRole,
  };
}
