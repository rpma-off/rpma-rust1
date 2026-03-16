'use client';

import { useEffect, useState } from 'react';
import { IPC_COMMANDS, safeInvoke } from '@/lib/ipc';

export interface HealthStatus {
  db: boolean;
  version: string;
}

export interface UseHealthCheckOptions {
  enabled?: boolean;
}

export function useHealthCheck(options: UseHealthCheckOptions = {}) {
  const { enabled = true } = options;
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setStatus(null);
      setHasFailed(false);
      return;
    }

    let cancelled = false;

    void safeInvoke<HealthStatus>(IPC_COMMANDS.SYSTEM_HEALTH_CHECK)
      .then((result) => {
        if (cancelled) {
          return;
        }

        setStatus(result);
        setHasFailed(!result.db);
      })
      .catch(() => {
        if (!cancelled) {
          setStatus(null);
          setHasFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    status,
    hasFailed,
    isHealthy: Boolean(status?.db) && !hasFailed,
  };
}
