'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Cpu, HardDrive, Network } from 'lucide-react';
import { usePerformance } from '../api';
import type { SystemHealth } from '../api/types';

export function SystemHealthCard() {
  const { systemHealth } = usePerformance();

  const getHealthStatusColor = (status: SystemHealth['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'unhealthy':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getHealthStatusText = (status: SystemHealth['status']) => {
    switch (status) {
      case 'healthy':
        return 'Sain';
      case 'degraded':
        return 'Dégradé';
      case 'unhealthy':
        return 'Non sain';
      default:
        return 'Inconnu';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}j ${hours}h ${minutes}m`;
  };

  if (!systemHealth) {
    return (
      <Card className="rpma-shell">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Santé système
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Données indisponibles
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rpma-shell">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5" />
          Santé système
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b">
          <span className="text-sm text-muted-foreground">Statut</span>
          <span className={`text-lg font-bold ${getHealthStatusColor(systemHealth.status)}`}>
            {getHealthStatusText(systemHealth.status)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Temps de fonctionnement</div>
            <div className="text-sm font-medium text-foreground">{formatUptime(systemHealth.uptime_seconds)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Connexions actives</div>
            <div className="text-sm font-medium text-foreground">{systemHealth.active_connections}</div>
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">CPU</span>
              </div>
              <span className="text-sm font-medium text-foreground">{systemHealth.cpu_usage_percent.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-[hsl(var(--rpma-surface-light))] rounded-full overflow-hidden">
              <div
                className={`h-full ${systemHealth.cpu_usage_percent > 80 ? 'bg-red-500' : systemHealth.cpu_usage_percent > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${systemHealth.cpu_usage_percent}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Mémoire</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatBytes(systemHealth.memory_usage_mb * 1024 * 1024)} / {formatBytes(systemHealth.memory_limit_mb * 1024 * 1024)}
              </span>
            </div>
            <div className="h-2 bg-[hsl(var(--rpma-surface-light))] rounded-full overflow-hidden">
              <div
                className={`h-full ${systemHealth.memory_usage_mb / systemHealth.memory_limit_mb > 0.8 ? 'bg-red-500' : systemHealth.memory_usage_mb / systemHealth.memory_limit_mb > 0.6 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${(systemHealth.memory_usage_mb / systemHealth.memory_limit_mb) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Disque</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatBytes(systemHealth.disk_usage_bytes)} / {formatBytes(systemHealth.disk_limit_bytes)}
              </span>
            </div>
            <div className="h-2 bg-[hsl(var(--rpma-surface-light))] rounded-full overflow-hidden">
              <div
                className={`h-full ${systemHealth.disk_usage_bytes / systemHealth.disk_limit_bytes > 0.8 ? 'bg-red-500' : systemHealth.disk_usage_bytes / systemHealth.disk_limit_bytes > 0.6 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${(systemHealth.disk_usage_bytes / systemHealth.disk_limit_bytes) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
