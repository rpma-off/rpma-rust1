import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/domains/auth';
import { ipcClient } from '@/lib/ipc';
import type { ClientStatistics } from '@/lib/backend';
import { useLogger } from '@/hooks/useLogger';
import { LogDomain } from '@/lib/logging/types';
import { normalizeError } from '@/types/utility.types';

export interface UseClientStatsOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
}

export interface UseClientStatsReturn {
  // Data
  stats: ClientStatistics | null;

  // Loading states
  loading: boolean;

  // Error states
  error: Error | null;

  // Actions
  refetch: () => Promise<void>;
}

export const useClientStats = (options: UseClientStatsOptions = {}): UseClientStatsReturn => {
  const { user } = useAuth();
  const { logInfo, logError } = useLogger({
    context: LogDomain.SYSTEM,
    component: 'useClientStats'
  });

  const { autoFetch = true, refreshInterval } = options;

  const [stats, setStats] = useState<ClientStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    if (!user?.token) return;

    try {
      setLoading(true);
      setError(null);

      logInfo('Fetching client statistics');

      const statsResult = await ipcClient.clients.stats(user.token);
      setStats(statsResult);

      logInfo('Client statistics fetched successfully');

    } catch (error: unknown) {
      const normalizedError = normalizeError(error);
      logError('Failed to fetch client statistics', normalizedError);
      setError(normalizedError);
    } finally {
      setLoading(false);
    }
  }, [user?.token, logInfo, logError]);

  const refetch = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchStats();
    }
  }, [fetchStats, autoFetch]);

  // Set up refresh interval if specified
  useEffect(() => {
    if (!refreshInterval || !autoFetch) return;

    const interval = setInterval(() => {
      fetchStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, autoFetch, fetchStats]);

  return {
    // Data
    stats,

    // Loading states
    loading,

    // Error states
    error,

    // Actions
    refetch,
  };
};
