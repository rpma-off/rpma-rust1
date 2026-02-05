'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Clock, Users, Ban, Eye, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ipcClient } from '@/lib/ipc';
import { toast } from 'react-hot-toast';

interface SecurityMetrics {
  total_events_today: number;
  critical_alerts_today: number;
  active_brute_force_attempts: number;
  blocked_ips: number;
  failed_auth_attempts_last_hour: number;
  suspicious_activities_detected: number;
}

interface SecurityAlert {
  id: string;
  event_id: string;
  title: string;
  description: string;
  severity: string;
  timestamp: string;
  acknowledged: boolean;
  resolved: boolean;
}

interface UserSession {
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

export interface SecurityDashboardProps {
  onRefresh?: () => void;
}

export function SecurityDashboard({ onRefresh }: SecurityDashboardProps) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSecurityData = async () => {
    if (!user?.token) return;

    try {
      setLoading(true);
      setError(null);

      const [metricsData, alertsData, sessionsData] = await Promise.all([
        ipcClient.security.getMetrics(user.token),
        ipcClient.security.getAlerts(user.token),
        ipcClient.security.getActiveSessions(user.token),
      ]);

      setMetrics(metricsData as SecurityMetrics);
      setAlerts(alertsData as SecurityAlert[]);
      setSessions(sessionsData as UserSession[]);
    } catch (err) {
      console.error('Failed to load security data:', err);
      setError('Erreur lors du chargement des donnÃ©es de sÃ©curitÃ©');
      toast.error('Erreur lors du chargement des donnÃ©es de sÃ©curitÃ©');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecurityData();
  }, [user?.token]);

  const handleAcknowledgeAlert = async (alertId: string) => {
    if (!user?.token) return;

    try {
      await ipcClient.security.acknowledgeAlert(alertId, user.token);
      toast.success('Alerte acquittÃ©e');
      loadSecurityData(); // Refresh data
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
      toast.error('Erreur lors de l\'acquittement de l\'alerte');
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!user?.token) return;

    try {
      await ipcClient.security.revokeSession(sessionId, user.token);
      toast.success('Session rÃ©voquÃ©e');
      loadSecurityData(); // Refresh data
    } catch (err) {
      console.error('Failed to revoke session:', err);
      toast.error('Erreur lors de la rÃ©vocation de la session');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-100 border-green-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card className="rpma-shell">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Shield className="h-8 w-8 animate-pulse mx-auto mb-2 text-[hsl(var(--rpma-teal))]" />
            <p className="text-muted-foreground">Chargement des donnÃ©es de sÃ©curitÃ©...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rpma-shell">
        <CardContent className="py-8">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <Card className="rpma-shell">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
            Vue d&apos;ensemble de la sÃ©curitÃ©
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-[hsl(var(--rpma-surface))] rounded-lg">
              <div className="text-2xl font-bold text-foreground">{metrics?.total_events_today || 0}</div>
              <div className="text-xs text-muted-foreground">Ã‰vÃ©nements aujourd&apos;hui</div>
            </div>
            <div className="text-center p-4 bg-red-500/10 rounded-lg">
              <div className="text-2xl font-bold text-red-400">{metrics?.critical_alerts_today || 0}</div>
              <div className="text-xs text-muted-foreground">Alertes critiques</div>
            </div>
            <div className="text-center p-4 bg-orange-500/10 rounded-lg">
              <div className="text-2xl font-bold text-orange-400">{metrics?.failed_auth_attempts_last_hour || 0}</div>
              <div className="text-xs text-muted-foreground">Ã‰checs d&apos;authentification</div>
            </div>
            <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
              <div className="text-2xl font-bold text-yellow-400">{metrics?.suspicious_activities_detected || 0}</div>
              <div className="text-xs text-muted-foreground">ActivitÃ©s suspectes</div>
            </div>
            <div className="text-center p-4 bg-purple-500/10 rounded-lg">
              <div className="text-2xl font-bold text-purple-400">{metrics?.blocked_ips || 0}</div>
              <div className="text-xs text-muted-foreground">IPs bloquÃ©es</div>
            </div>
            <div className="text-center p-4 bg-blue-500/10 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">{sessions.length}</div>
              <div className="text-xs text-muted-foreground">Sessions actives</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Security Alerts */}
      <Card className="rpma-shell">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Alertes de sÃ©curitÃ© actives
            <Badge variant="secondary" className="ml-auto">
              {alerts.filter(a => !a.resolved).length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.filter(alert => !alert.resolved).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              Aucune alerte active
            </div>
          ) : (
            <div className="space-y-3">
              {alerts
                .filter(alert => !alert.resolved)
                .slice(0, 5)
                .map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 bg-[hsl(var(--rpma-surface))] rounded-lg border">
                    <div className="flex-shrink-0 mt-0.5">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground">{alert.title}</h4>
                        <Badge className={`text-xs ${getSeverityColor(alert.severity)}`}>
                          {alert.severity}
                        </Badge>
                        {alert.acknowledged && (
                          <Badge variant="outline" className="text-xs">
                            AcquittÃ©e
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(alert.timestamp).toLocaleString('fr-FR')}
                        </span>
                        {!alert.acknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                            className="text-xs"
                          >
                            Acquitter
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card className="rpma-shell">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Sessions actives
            <Badge variant="secondary" className="ml-auto">
              {sessions.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune session active
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-[hsl(var(--rpma-surface))] rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{session.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.device_info?.ip_address || 'IP inconnue'} â€¢
                        DerniÃ¨re activitÃ©: {new Date(session.last_activity).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRevokeSession(session.id)}
                    className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    RÃ©voquer
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
