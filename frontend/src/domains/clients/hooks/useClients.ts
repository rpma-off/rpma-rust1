import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ClientWithTasks, CustomerType } from '@/lib/backend';
import { useMutationCounter } from '@/lib/data-freshness';
import { clientKeys } from '@/lib/query-keys';
import { LogDomain } from '@/lib/logging/types';
import { useLogger } from '@/shared/hooks/useLogger';
import { normalizeError } from '@/types/utility.types';
import { useAuth } from '@/shared/hooks/useAuth';
import { clientService, type ClientStats } from '../services';

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
  stats: ClientStats | null;

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
  const clientsMutations = useMutationCounter('clients');

  const { filters: initialFilters = {}, autoFetch = true, limitTasks = 10 } = options;

  const [filters, setFilters] = useState<ClientFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters
  });

  const clientsQuery = useQuery({
    queryKey: [...clientKeys.list(), filters, limitTasks, clientsMutations],
    queryFn: async () => {
      if (!user?.token) throw new Error('Not authenticated');
      logInfo('Fetching clients with tasks', { filters });
      const response = await clientService.getClientsWithTasks(user.token, {
        page: filters.page,
        limit: filters.limit,
        search: filters.search,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order,
        customer_type: filters.customer_type ?? undefined
      }, limitTasks);

      if (response.success && response.data) {
        logInfo('Clients fetched successfully', { count: response.data.data.length || 0 });
        return response.data;
      }
      const errorMsg = typeof response.error === 'string' ? response.error : response.error?.message || 'Failed to fetch clients';
      throw new Error(errorMsg);
    },
    enabled: autoFetch && !!user?.token,
  });

  const statsQuery = useQuery({
    queryKey: [...clientKeys.stats(), clientsMutations],
    queryFn: async () => {
      if (!user?.token) throw new Error('Not authenticated');
      const response = await clientService.getClientStats(user.token);
      if (response.success && response.data) {
        logInfo('Client stats fetched successfully');
        return response.data;
      }
      const errorMsg = typeof response.error === 'string' ? response.error : response.error?.message || 'Failed to fetch client stats';
      throw new Error(errorMsg);
    },
    enabled: autoFetch && !!user?.token,
  });

  const updateFilters = useCallback((newFilters: Partial<ClientFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const goToPage = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const clientsData = clientsQuery.data?.data || [];
  const paginationData = clientsQuery.data?.pagination ? {
    page: clientsQuery.data.pagination.page,
    limit: clientsQuery.data.pagination.limit,
    total: Number(clientsQuery.data.pagination.total),
    total_pages: clientsQuery.data.pagination.total_pages
  } : null;

  const hasNextPage = paginationData ? paginationData.page < paginationData.total_pages : false;
  const hasPreviousPage = paginationData ? paginationData.page > 1 : false;

  const error = clientsQuery.error ? normalizeError(clientsQuery.error) : null;
  if (error && !clientsQuery.isFetching) {
    logError('Failed to fetch clients', error);
  }

  return {
    // Data
    clients: clientsData,
    stats: statsQuery.data || null,

    // Loading states
    loading: clientsQuery.isLoading,
    loadingStats: statsQuery.isLoading,

    // Error states
    error,

    // Pagination
    pagination: paginationData,

    // Actions
    refetch: async () => { await clientsQuery.refetch(); },
    refetchStats: async () => { await statsQuery.refetch(); },
    updateFilters,
    goToPage,

    // Helpers
    hasNextPage,
    hasPreviousPage,
  };
};
