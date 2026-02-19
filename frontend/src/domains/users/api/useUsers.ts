'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/domains/auth';
import { ipcClient } from '@/lib/ipc';
import type { UserAccount, UseUsersResult } from './types';

export function useUsers(limit: number = 50, offset: number = 0): UseUsersResult {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!user?.token) {
      setUsers([]);
      setError('Authentication required');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await ipcClient.users.list(limit, offset, user.token);
      setUsers((response?.data ?? []) as UserAccount[]);
    } catch (err) {
      setUsers([]);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [limit, offset, user?.token]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    users,
    loading,
    error,
    refetch,
  };
}
