'use client';

import { useQuery } from '@tanstack/react-query';
import { auditKeys } from '@/lib/query-keys';
import { changeLogService } from '../server';
import type { ChangeLogWithUser } from './types';
import type { UseAuditLogResult } from './types';

export function useAuditLog(): UseAuditLogResult {
  const { data, isLoading, error, refetch } = useQuery<ChangeLogWithUser[], Error>({
    queryKey: auditKeys.logs(),
    queryFn: () => changeLogService.getChangeLogs(),
  });

  return {
    logs: data ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refetch: () => refetch().then(() => undefined),
  };
}

export function useChangeTracking() {
  return useAuditLog();
}
