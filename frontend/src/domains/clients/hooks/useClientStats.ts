import { useQuery } from '@tanstack/react-query';
import { clientKeys } from '@/lib/query-keys';
import { useMutationCounter } from '@/lib/data-freshness';
import { LogDomain } from '@/lib/logging/types';
import { useLogger } from '@/shared/hooks/useLogger';
import { useAuth } from '@/shared/hooks/useAuth';
import { normalizeError } from '@/types/utility.types';
import { clientService, type ClientStats } from '../services';

export interface UseClientStatsOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
}

export interface UseClientStatsReturn {
  // Data
  stats: ClientStats | null;

  // Loading states
  loading: boolean;

  // Error states
  error: Error | null;

  // Actions
  refetch: () => Promise<void>;
}

export const useClientStats = (options: UseClientStatsOptions = {}): UseClientStatsReturn => {
  const { user } = useAuth();
  const token = user?.token;
  const { logInfo, logError } = useLogger({
    context: LogDomain.SYSTEM,
    component: 'useClientStats'
  });
  const clientMutations = useMutationCounter('clients');

  const { autoFetch = true, refreshInterval } = options;

  const query = useQuery({
    queryKey: [...clientKeys.stats(), clientMutations],
    queryFn: async () => {
      if (!token) {
        throw new Error('Authentication required');
      }

      logInfo('Fetching client statistics');

      const response = await clientService.getClientStats(token);

      if (response.success && response.data) {
        logInfo('Client statistics fetched successfully');
        return response.data;
      }

      throw new Error(typeof response.error === 'string' ? response.error : 'Failed to fetch client statistics');
    },
    enabled: autoFetch && !!token,
    retry: false,
    refetchInterval: refreshInterval && autoFetch
      ? () => (
        typeof document !== 'undefined' && document.visibilityState === 'visible'
          ? refreshInterval
          : false
      )
      : false,
  });

  const error = query.error ? normalizeError(query.error) : null;
  if (error && !query.isFetching) {
    logError('Failed to fetch client statistics', error);
  }

  return {
    stats: query.data ?? null,
    loading: query.isLoading,
    error,
    refetch: async () => {
      await query.refetch();
    },
  };
};
