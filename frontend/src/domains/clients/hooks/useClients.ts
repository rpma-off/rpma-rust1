import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/domains/auth';
import { ipcClient } from '@/lib/ipc';
import type { ClientWithTasks, ClientStatistics, CustomerType } from '@/lib/backend';
import { useLogger } from '@/shared/hooks/useLogger';
import { LogDomain } from '@/lib/logging/types';
import { normalizeError } from '@/types/utility.types';

export interface ClientFilters {
  search?: string;
  customer_type?: CustomerType | null;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface UseClientsOptions {
  filters?: ClientFilters;
  autoFetch?: boolean;
  limitTasks?: number;
}

export interface UseClientsReturn {
  // Data
  clients: ClientWithTasks[];
  stats: ClientStatistics | null;

  // Loading states
  loading: boolean;
  loadingStats: boolean;

  // Error states
  error: Error | null;

  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null;

  // Actions
  refetch: () => Promise<void>;
  refetchStats: () => Promise<void>;
  updateFilters: (filters: Partial<ClientFilters>) => void;
  goToPage: (page: number) => void;

  // Helpers
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const DEFAULT_FILTERS: ClientFilters = {
  page: 1,
  limit: 20,
  sort_by: 'created_at',
  sort_order: 'desc'
};

export const useClients = (options: UseClientsOptions = {}): UseClientsReturn => {
  const { user } = useAuth();
  const { logInfo, logError } = useLogger({
    context: LogDomain.SYSTEM,
    component: 'useClients'
  });

  const { filters: initialFilters = {}, autoFetch = true, limitTasks = 10 } = options;

  const [filters, setFilters] = useState<ClientFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters
  });

  const [clients, setClients] = useState<ClientWithTasks[]>([]);
  const [stats, setStats] = useState<ClientStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } | null>(null);

  const fetchClients = useCallback(async () => {
    if (!user?.token) return;

    try {
      setLoading(true);
      setError(null);

      logInfo('Fetching clients with tasks', { filters });

      const result = await ipcClient.clients.listWithTasks(
        filters,
        limitTasks,
        user.token
      );

      setClients(result);
      setPagination(null);

      logInfo('Clients fetched successfully', {
        count: result.length
      });

    } catch (error: unknown) {
      const normalizedError = normalizeError(error);
      logError('Failed to fetch clients', normalizedError);
      setError(normalizedError);
    } finally {
      setLoading(false);
    }
  }, [user?.token, filters, limitTasks, logInfo, logError]);

  const fetchStats = useCallback(async () => {
    if (!user?.token) return;

    try {
      setLoadingStats(true);

      const statsResult = await ipcClient.clients.stats(user.token);
      setStats(statsResult);

      logInfo('Client stats fetched successfully');

    } catch (error: unknown) {
      const normalizedError = normalizeError(error);
      logError('Failed to fetch client stats', normalizedError);
    } finally {
      setLoadingStats(false);
    }
  }, [user?.token, logInfo, logError]);

  const updateFilters = useCallback((newFilters: Partial<ClientFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 })); // Reset to page 1 when filters change
  }, []);

  const goToPage = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const refetch = useCallback(async () => {
    await fetchClients();
  }, [fetchClients]);

  const refetchStats = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  // Auto-fetch on mount and when filters change
  useEffect(() => {
    if (autoFetch) {
      fetchClients();
    }
  }, [fetchClients, autoFetch]);

  // Fetch stats on mount
  useEffect(() => {
    if (autoFetch) {
      fetchStats();
    }
  }, [fetchStats, autoFetch]);

  const hasNextPage = pagination ? pagination.page < pagination.total_pages : false;
  const hasPreviousPage = pagination ? pagination.page > 1 : false;

  return {
    // Data
    clients,
    stats,

    // Loading states
    loading,
    loadingStats,

    // Error states
    error,

    // Pagination
    pagination,

    // Actions
    refetch,
    refetchStats,
    updateFilters,
    goToPage,

    // Helpers
    hasNextPage,
    hasPreviousPage,
  };
};
