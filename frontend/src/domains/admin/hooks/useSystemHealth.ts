import { useState, useEffect, useCallback } from 'react';
import { IPC_COMMANDS } from '@/lib/ipc';
import { safeInvoke } from '@/lib/ipc';
import type { SystemStatus } from '@/shared/types';
import type { JsonValue } from '@/shared/types';

export interface UseSystemHealthOptions {
  /** Polling interval in ms (default: 30000) */
  pollInterval?: number;
  /** Whether to start polling automatically (default: true) */
  autoStart?: boolean;
}

export interface UseSystemHealthReturn {
  systemStatus: 'healthy' | 'warning' | 'error';
  statusDetails: SystemStatus | null;
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
}

function parseHealthResult(result: JsonValue | null): SystemStatus | null {
  if (!result || typeof result !== 'object' || !('status' in result)) {
    return null;
  }

  const healthData = result as Record<string, JsonValue>;
  const overallStatus =
    (healthData.status as string) === 'healthy'
      ? ('healthy' as const)
      : ('warning' as const);
  const now = new Date().toISOString();

  const components: Record<
    string,
    { status: 'healthy' | 'warning' | 'error'; message?: string; lastChecked: string }
  > = {};

  if (healthData.components && typeof healthData.components === 'object') {
    for (const [key, val] of Object.entries(
      healthData.components as Record<string, JsonValue>,
    )) {
      const comp = val as Record<string, JsonValue>;
      components[key] = {
        status:
          (comp.status as string) === 'healthy'
            ? 'healthy'
            : (comp.status as string) === 'warning'
              ? 'warning'
              : 'error',
        message: (comp.message as string) || '',
        lastChecked: (comp.lastChecked as string) || now,
      };
    }
  }

  return { status: overallStatus, components, timestamp: now };
}

export function useSystemHealth(
  options: UseSystemHealthOptions = {},
): UseSystemHealthReturn {
  const { pollInterval = 30000, autoStart = true } = options;

  const [systemStatus, setSystemStatus] = useState<'healthy' | 'warning' | 'error'>('healthy');
  const [statusDetails, setStatusDetails] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const checkHealth = useCallback(async () => {
    try {
      const result = await safeInvoke<JsonValue>(IPC_COMMANDS.HEALTH_CHECK, {});
      const parsed = parseHealthResult(result);
      if (parsed) {
        setStatusDetails(parsed);
        setSystemStatus(parsed.status);
      } else {
        setSystemStatus('healthy');
      }
    } catch {
      setSystemStatus('error');
      setStatusDetails({
        status: 'error',
        components: {
          system: {
            status: 'error',
            message: 'Impossible de contacter le backend',
            lastChecked: new Date().toISOString(),
          },
        },
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  useEffect(() => {
    if (!autoStart) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      await checkHealth();
      if (!cancelled) setLoading(false);
    };

    run();

    const interval = setInterval(() => {
      if (!cancelled) checkHealth();
    }, pollInterval);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [autoStart, pollInterval, checkHealth]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await checkHealth();
    setRefreshing(false);
  }, [checkHealth]);

  return { systemStatus, statusDetails, loading, refreshing, refresh };
}
