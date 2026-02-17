'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { toast } from 'sonner';
import { LoadingState } from '@/shared/ui/layout/LoadingState';
import { Activity, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { SystemStatus } from '@/shared/types';
import { IPC_COMMANDS, safeInvoke } from '@/shared/utils';
import type { JsonValue } from '@/shared/types';

export function MonitoringTab() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSystemStatus();
  }, []);

  const loadSystemStatus = async () => {
    try {
      const result = await safeInvoke<JsonValue>(IPC_COMMANDS.HEALTH_CHECK, {});
      if (result && typeof result === 'object') {
        const healthData = result as Record<string, JsonValue>;
        const overallStatus = (healthData.status as string) === 'healthy' ? 'healthy' as const : 'warning' as const;
        const now = new Date().toISOString();

        const components: Record<
          string,
          { status: 'healthy' | 'warning' | 'error'; message?: string; lastChecked: string }
        > = {};

        if (healthData.components && typeof healthData.components === 'object') {
          for (const [key, val] of Object.entries(healthData.components as Record<string, JsonValue>)) {
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

        const status: SystemStatus = {
          status: overallStatus,
          components,
          timestamp: now,
        };
        setSystemStatus(status);
      }
    } catch (error) {
      console.error('Error loading system status:', error);
      toast.error('Erreur lors du chargement du statut système');
      setSystemStatus({
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
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    setRefreshing(true);
    await loadSystemStatus();
    setRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Activity className="h-5 w-5 text-slate-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  const componentEntries = systemStatus ? Object.entries(systemStatus.components) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Monitoring</h2>
          <p className="text-muted-foreground">Surveillez la santé du système en temps réel</p>
        </div>
        <Button onClick={refreshStatus} disabled={refreshing} variant="outline">
          {refreshing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Actualiser
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
            État du Système
          </CardTitle>
          <CardDescription>
            Dernière vérification: {systemStatus ? new Date(systemStatus.timestamp).toLocaleString('fr-FR') : 'N/A'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {componentEntries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[hsl(var(--rpma-border))] p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Aucune donnée de composant disponible pour le moment. Utilisez &quot;Actualiser&quot; pour relancer la vérification.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {componentEntries.map(([key, component]) => (
                <div key={key} className={`p-4 rounded-lg border ${getStatusColor(component.status)}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    {getStatusIcon(component.status)}
                    <span className="font-medium capitalize">{key}</span>
                  </div>
                  <p className="text-sm opacity-80">{component.message || 'Aucun détail fourni'}</p>
                  <p className="text-xs opacity-60 mt-1">
                    Vérifié: {new Date(component.lastChecked).toLocaleTimeString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

