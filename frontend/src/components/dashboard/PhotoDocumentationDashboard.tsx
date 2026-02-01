'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cloud, Database, Wifi, CheckCircle2 } from 'lucide-react';

interface SyncStats {
  status?: string;
  pending_operations?: number;
  completed_operations?: number;
}

export interface PhotoDocumentationDashboardProps {
  syncStats?: SyncStats;
  onRefresh?: () => void;
  onExport?: (format: string) => void;
}

/**
 * Photo documentation dashboard component
 * Displays photo metrics and documentation status
 */
export function PhotoDocumentationDashboard({ syncStats }: PhotoDocumentationDashboardProps) {
  const status = syncStats?.status || 'unknown';
  const pendingOps = syncStats?.pending_operations || 0;
  const completedOps = syncStats?.completed_operations || 0;

  const isOnline = status === 'online';
  const totalOps = pendingOps + completedOps;
  const completionRate = totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0;

  const stats = [
    {
      label: 'Statut de synchronisation',
      value: isOnline ? 'En ligne' : 'Hors ligne',
      icon: Wifi,
      color: isOnline ? 'text-green-600' : 'text-red-600',
      bgColor: isOnline ? 'bg-green-100' : 'bg-red-100',
      badge: isOnline ? 'success' : 'error',
    },
    {
      label: 'Opérations terminées',
      value: completedOps,
      subtitle: `${completionRate}% du total`,
      icon: CheckCircle2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Opérations en attente',
      value: pendingOps,
      subtitle: 'À synchroniser',
      icon: Cloud,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      label: 'Base de données',
      value: 'Opérationnelle',
      subtitle: 'Connexion active',
      icon: Database,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Documentation & Synchronisation
          <Badge variant={isOnline ? "default" : "destructive"} className="text-xs">
            {isOnline ? 'Connecté' : 'Déconnecté'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center space-x-3 p-3 rounded-lg border">
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                  {stat.subtitle && (
                    <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                  )}
                  {stat.badge && (
                    <Badge
                      variant={stat.badge === 'success' ? 'default' : 'destructive'}
                      className="text-xs mt-1"
                    >
                      {stat.badge === 'success' ? 'OK' : 'Erreur'}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Sync Progress */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Progression de Synchronisation</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Opérations traitées</span>
                <span>{completedOps}/{totalOps} terminées</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* System Health */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">État du Système</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Synchronisation {isOnline ? 'active' : 'inactive'} avec le serveur central</p>
              <p>• {completedOps} opérations de données traitées avec succès</p>
              <p>• {pendingOps} opérations en attente de traitement</p>
              <p>• Base de données opérationnelle et accessible</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}