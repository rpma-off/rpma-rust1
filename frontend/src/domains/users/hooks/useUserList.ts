'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/domains/auth';
import { ipcClient } from '@/lib/ipc';
import { convertTimestamps } from '@/lib/types';
import { logger, LogContext } from '@/shared/utils';
import type { UserAccount } from '@/types';

export interface UseUserListReturn {
  users: UserAccount[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Load the full user list with automatic timestamp conversion.
 */
export function useUserList(limit = 50, offset = 0): UseUserListReturn {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
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
      logger.debug(LogContext.API, 'useUserList: fetching users');
      const response = await ipcClient.users.list(limit, offset, user.token);
      const converted = (response?.data ?? []).map((u) =>
        convertTimestamps(u),
      ) as unknown as UserAccount[];
      setUsers(converted);
    } catch (err) {
      logger.error(LogContext.API, 'useUserList: error', { error: err });
      setUsers([]);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [limit, offset, user?.token]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { users, loading, error, refetch };
}
