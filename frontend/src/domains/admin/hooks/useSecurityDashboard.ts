import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ipcClient } from '@/lib/ipc';
import { useAuth } from '@/shared/hooks/useAuth';

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
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [sessions, setSessions] = useState<ActiveSecuritySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.token) {
      setMetrics(null);
      setAlerts([]);
      setSessions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [metricsData, alertsData, sessionsData] = await Promise.all([
        ipcClient.audit.getMetrics(),
        ipcClient.audit.getAlerts(),
        ipcClient.settings.getActiveSessions(),
      ]);

      setMetrics(metricsData as unknown as SecurityMetrics);
      setAlerts(alertsData as unknown as SecurityAlert[]);
      setSessions(sessionsData as unknown as ActiveSecuritySession[]);
    } catch (err) {
      console.error('Failed to load security data:', err);
      setError('Erreur lors du chargement des données de sécurité');
      toast.error('Erreur lors du chargement des données de sécurité');
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const acknowledgeAlert = useCallback(
    async (alertId: string) => {
      await ipcClient.audit.acknowledgeAlert(alertId);
      toast.success('Alerte acquittée');
      await refresh();
    },
    [refresh],
  );

  const revokeSession = useCallback(
    async (sessionId: string) => {
      await ipcClient.settings.revokeSession(sessionId);
      toast.success('Session révoquée');
      await refresh();
    },
    [refresh],
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
    error,
    refresh,
    acknowledgeAlert,
    revokeSession,
  };
}
