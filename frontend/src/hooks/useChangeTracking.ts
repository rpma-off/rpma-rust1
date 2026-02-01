import { useCallback, useEffect, useState } from 'react';
import { changeLogService } from '@/lib/services/change-log.service';
import type { ChangeLogWithUser } from '@/lib/services/change-log.service';

export function useRecordChanges(
  tableName: string,
  recordId: string,
  options: {
    enabled?: boolean;
    limit?: number;
  } = {}
) {
  const { enabled = true, limit = 50 } = options;
  const [changes, setChanges] = useState<ChangeLogWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled || !tableName || !recordId) return;
    
    setLoading(true);
    try {
      const data = await changeLogService.getRecordChanges(tableName, recordId);

      setChanges(data.slice(0, limit));
      setCount(data.length);
      setError(null);
    } catch (err) {
      console.error('Error fetching changes:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch changes'));
    } finally {
      setLoading(false);
    }
  }, [enabled, tableName, recordId, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    changes,
    loading,
    error,
    count,
    refresh,
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
  const [changes, setChanges] = useState<ChangeLogWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled || !tableName) return;
    
    setLoading(true);
    try {
      const data = await changeLogService.getTableChanges(tableName);

      setChanges(data.slice(0, limit));
      setCount(data.length);
      setError(null);
    } catch (err) {
      console.error('Error fetching table changes:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch table changes'));
    } finally {
      setLoading(false);
    }
  }, [enabled, tableName, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    changes,
    loading,
    error,
    count,
    refresh,
  };
}
