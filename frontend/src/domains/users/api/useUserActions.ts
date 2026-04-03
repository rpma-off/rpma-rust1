'use client';

import { useCallback } from 'react';
import type { UpdateUserRequest, UserAccount } from '@/lib/backend';
import { useAuth } from '@/shared/hooks/useAuth';
import { userIpc } from '../ipc/users.ipc';
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
      const response = await userIpc.create(payload);
      return response !== null;
    },
    [user?.token]
  );

  const updateUser = useCallback(
    async (id: string, updates: Partial<UserAccount>) => {
      if (!user?.token) return false;
      const response = await userIpc.update(id, updates as unknown as UpdateUserRequest);
      return response !== null;
    },
    [user?.token]
  );

  const deleteUser = useCallback(async (id: string) => {
    if (!user?.token) return false;
    const response = await userIpc.delete(id);
    return response !== null;
  }, [user?.token]);

  const banUser = useCallback(async (id: string) => {
    if (!user?.token) return false;
    const response = await userIpc.banUser(id);
    return response !== null;
  }, [user?.token]);

  const unbanUser = useCallback(async (id: string) => {
    if (!user?.token) return false;
    const response = await userIpc.unbanUser(id);
    return response !== null;
  }, [user?.token]);

  const changeRole = useCallback(async (id: string, role: string) => {
    if (!user?.token) return false;
    const response = await userIpc.changeRole(id, role);
    return response !== null;
  }, [user?.token]);

  const adminResetPassword = useCallback(async (id: string): Promise<string | null> => {
    if (!user?.token) return null;
    return userIpc.adminResetPassword(id);
  }, [user?.token]);

  return {
    createUser,
    updateUser,
    deleteUser,
    banUser,
    unbanUser,
    changeRole,
    adminResetPassword,
  };
}
