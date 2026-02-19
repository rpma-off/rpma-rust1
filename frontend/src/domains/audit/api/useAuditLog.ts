'use client';

import { useCallback, useEffect, useState } from 'react';
import { changeLogService } from '../server';
import type { ChangeLogWithUser } from './types';
import type { UseAuditLogResult } from './types';

export function useAuditLog(): UseAuditLogResult {
  const [logs, setLogs] = useState<ChangeLogWithUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await changeLogService.getChangeLogs();
      setLogs(data ?? []);
    } catch (err) {
      setLogs([]);
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    logs,
    loading,
    error,
    refetch,
  };
}

export function useChangeTracking() {
  return useAuditLog();
}
