'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logging';
import { LogDomain } from '@/lib/logging/types';
import type { Client, ClientWithTasks } from '@/shared/types';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { useAuth } from '@/shared/hooks/useAuth';
import { clientService } from '../server';
import { computeClientStats } from '../utils/client-stats';
import { useClients } from './useClients';

const INITIAL_SORT_FILTERS = { sort_by: 'name', sort_order: 'asc' as const };

export function useClientsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [uiFilters, setUiFilters] = useState<{
    customer_type: string;
    sort_by: string;
    sort_order: string;
  }>({ customer_type: '', ...INITIAL_SORT_FILTERS });
  const [operationError, setOperationError] = useState<string | null>(null);

  const { clients, loading, error: fetchError, refetch, updateFilters } = useClients({
    filters: INITIAL_SORT_FILTERS,
    autoFetch: true,
  });

  const error = operationError ?? fetchError?.message ?? null;
  const clientStats = useMemo(() => computeClientStats(clients), [clients]);
  const isInitialLoading = loading && clients.length === 0;

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      updateFilters({ search: query || undefined });
    },
    [updateFilters],
  );

  const handleFilterChange = useCallback(
    (newFilters: { customer_type?: string; sort_by?: string; sort_order?: string }) => {
      setUiFilters(prev => ({ ...prev, ...newFilters }));
      updateFilters({
        customer_type: (newFilters.customer_type || undefined) as
          | 'individual'
          | 'business'
          | undefined,
        sort_by: newFilters.sort_by,
        sort_order: newFilters.sort_order as 'asc' | 'desc' | undefined,
      });
    },
    [updateFilters],
  );

  const handleClientSelect = useCallback(
    (client: Client | ClientWithTasks) => {
      router.push(`/clients/${client.id}`);
    },
    [router],
  );

  const handleClientEdit = useCallback(
    (client: Client | ClientWithTasks) => {
      router.push(`/clients/${client.id}/edit`);
    },
    [router],
  );

  const handleClientDelete = useCallback(
    async (client: Client | ClientWithTasks) => {
      if (!confirm(t('confirm.deleteClient', { name: client.name }))) return;

      if (!user?.id) {
        setOperationError(t('errors.authRequired'));
        return;
      }

      try {
        const response = await clientService.deleteClient(client.id, user.token);
        if (response.error) {
          setOperationError(response.error || t('errors.deleteFailed'));
          return;
        }
        refetch();
      } catch (err) {
        setOperationError(t('errors.unexpected'));
        logger.error(LogDomain.CLIENT, 'Error deleting client', err instanceof Error ? err : new Error(String(err)));
      }
    },
    [refetch, user?.id, user?.token, t],
  );

  const handleClientCreateTask = useCallback(
    (client: Client | ClientWithTasks) => {
      router.push(`/tasks/new?clientId=${client.id}`);
    },
    [router],
  );

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    t,
    clients,
    loading,
    error,
    clientStats,
    searchQuery,
    uiFilters,
    isInitialLoading,
    router,
    handleSearch,
    handleFilterChange,
    handleClientSelect,
    handleClientEdit,
    handleClientDelete,
    handleClientCreateTask,
    handleRefresh,
  };
}
