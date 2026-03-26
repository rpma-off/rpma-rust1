'use client';

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { auditIpc } from '../ipc/audit.ipc';
import { adminKeys } from '@/lib/query-keys';
import type { AuditActivityFilter, PaginatedUserActivity } from '@/lib/backend';

export function useUserActivity(filters: AuditActivityFilter = {
  user_id: null,
  event_type: null,
  resource_type: null,
  start_date: undefined,
  end_date: undefined,
  limit: 50,
  offset: 0,
}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: adminKeys.activityAudit(filters),
    queryFn: () => auditIpc.getAllUserActivity(filters),
    staleTime: 30_000,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: adminKeys.activityAudit(),
    });
  }, [queryClient]);

  return {
    data: query.data,
    records: useMemo(() => query.data?.records ?? [], [query.data]),
    total: query.data?.total ?? 0,
    hasMore: query.data?.has_more ?? false,
    loading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error instanceof Error ? query.error.message : null,
    refresh,
  };
}

export function useAuditEventTypes() {
  const query = useQuery({
    queryKey: adminKeys.eventTypes(),
    queryFn: () => auditIpc.getAuditEventTypes(),
    staleTime: 300_000, // 5 minutes
  });

  return {
    eventTypes: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  };
}
