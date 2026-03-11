import { useQuery } from '@tanstack/react-query';
import { changeLogService } from '../server';
import type { ChangeLogWithUser } from '../server';

export function useRecordChanges(
  tableName: string,
  recordId: string,
  options: {
    enabled?: boolean;
    limit?: number;
  } = {}
) {
  const { enabled = true, limit = 50 } = options;

  const { data, isLoading, error, refetch } = useQuery<ChangeLogWithUser[], Error>({
    queryKey: ['audit', 'record', tableName, recordId, limit],
    queryFn: () => changeLogService.getRecordChanges(tableName, recordId),
    enabled: enabled && Boolean(tableName) && Boolean(recordId),
    select: (rows) => rows.slice(0, limit),
  });

  return {
    changes: data ?? [],
    loading: isLoading,
    error: error ?? null,
    count: data?.length ?? 0,
    refresh: () => refetch().then(() => undefined),
  };
}

export function useTableChanges(
  tableName: string,
  options: {
    enabled?: boolean;
    limit?: number;
  } = {}
) {
  const { enabled = true, limit = 50 } = options;

  const { data, isLoading, error, refetch } = useQuery<ChangeLogWithUser[], Error>({
    queryKey: ['audit', 'table', tableName, limit],
    queryFn: () => changeLogService.getTableChanges(tableName),
    enabled: enabled && Boolean(tableName),
    select: (rows) => rows.slice(0, limit),
  });

  return {
    changes: data ?? [],
    loading: isLoading,
    error: error ?? null,
    count: data?.length ?? 0,
    refresh: () => refetch().then(() => undefined),
  };
}
