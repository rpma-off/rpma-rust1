import { useCallback, useMemo } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ipcClient } from "@/lib/ipc";
import { adminKeys } from "@/lib/query-keys";
import { useAuth } from "@/shared/hooks/useAuth";

export interface SecurityMetrics {
  total_events_today: number;
  critical_alerts_today: number;
  active_brute_force_attempts: number;
  blocked_ips: number;
  failed_auth_attempts_last_hour: number;
  suspicious_activities_detected: number;
}

export interface SecurityAlert {
  id: string;
  event_id: string;
  title: string;
  description: string;
  severity: string;
  timestamp: string;
  acknowledged: boolean;
  resolved: boolean;
}

export interface ActiveSecuritySession {
  id: string;
  user_id: string;
  username: string;
  device_info?: {
    user_agent?: string;
    ip_address?: string;
  };
  last_activity: string;
  created_at: string;
}

export function useSecurityDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const enabled = !!user?.token;

  const [metricsQuery, alertsQuery, sessionsQuery] = useQueries({
    queries: [
      {
        queryKey: adminKeys.securityMetrics(),
        queryFn: () => ipcClient.audit.getMetrics(),
        enabled,
        staleTime: 30_000,
      },
      {
        queryKey: adminKeys.securityAlerts(),
        queryFn: () => ipcClient.audit.getAlerts(),
        enabled,
        staleTime: 30_000,
      },
      {
        queryKey: adminKeys.sessions(),
        queryFn: () => ipcClient.settings.getActiveSessions(),
        enabled,
        staleTime: 30_000,
      },
    ],
  });

  const loading =
    metricsQuery.isLoading || alertsQuery.isLoading || sessionsQuery.isLoading;
  const error = metricsQuery.error || alertsQuery.error || sessionsQuery.error;

  const metrics =
    (metricsQuery.data as unknown as SecurityMetrics | null) ?? null;
  const alerts = (alertsQuery.data as unknown as SecurityAlert[]) ?? [];
  const sessions =
    (sessionsQuery.data as unknown as ActiveSecuritySession[]) ?? [];

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.securityMetrics() }),
      queryClient.invalidateQueries({ queryKey: adminKeys.securityAlerts() }),
      queryClient.invalidateQueries({ queryKey: adminKeys.sessions() }),
    ]);
  }, [queryClient]);

  const acknowledgeAlert = useCallback(
    async (alertId: string) => {
      await ipcClient.audit.acknowledgeAlert(alertId);
      toast.success("Alerte acquittée");
      await queryClient.invalidateQueries({
        queryKey: adminKeys.securityAlerts(),
      });
    },
    [queryClient],
  );

  const revokeSession = useCallback(
    async (sessionId: string) => {
      await ipcClient.settings.revokeSession(sessionId);
      toast.success("Session révoquée");
      await queryClient.invalidateQueries({ queryKey: adminKeys.sessions() });
    },
    [queryClient],
  );

  const unresolvedAlerts = useMemo(
    () => alerts.filter((alert) => !alert.resolved),
    [alerts],
  );

  return {
    metrics,
    alerts,
    sessions,
    unresolvedAlerts,
    loading,
    error: error instanceof Error ? error.message : null,
    refresh,
    acknowledgeAlert,
    revokeSession,
  };
}
