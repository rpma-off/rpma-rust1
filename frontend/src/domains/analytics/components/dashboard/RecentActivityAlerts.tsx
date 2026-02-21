"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface RecentActivityAlertsProps {
  className?: string;
}

export function RecentActivityAlerts({ className }: RecentActivityAlertsProps) {
  // Mock alerts data
  const alerts: ActivityAlert[] = [
    {
      id: '1',
      type: 'warning',
      title: 'Maintenance requise',
      message: 'Le véhicule ABC123 nécessite une maintenance préventive',
      timestamp: '2024-01-15T10:30:00Z',
      read: false
    },
    {
      id: '2',
      type: 'success',
      title: 'Tâche terminée',
      message: 'Installation PPF terminée pour le client XYZ Corp',
      timestamp: '2024-01-15T09:15:00Z',
      read: true
    },
    {
      id: '3',
      type: 'info',
      title: 'Nouveau client',
      message: 'Client "Auto Plus" ajouté à la base de données',
      timestamp: '2024-01-15T08:45:00Z',
      read: true
    },
    {
      id: '4',
      type: 'error',
      title: 'Erreur système',
      message: 'Échec de synchronisation avec le serveur distant',
      timestamp: '2024-01-15T08:00:00Z',
      read: false
    }
  ];

  const getAlertIcon = (type: ActivityAlert['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getAlertColor = (type: ActivityAlert['type']) => {
    switch (type) {
      case 'warning':
        return 'border-l-yellow-500';
      case 'error':
        return 'border-l-red-500';
      case 'success':
        return 'border-l-green-500';
      case 'info':
        return 'border-l-blue-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const unreadCount = alerts.filter(alert => !alert.read).length;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alertes Récentes
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm">
          Tout marquer comme lu
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.slice(0, 5).map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "flex items-start space-x-3 p-3 border-l-4 rounded-r-lg bg-card",
                getAlertColor(alert.type),
                !alert.read && "bg-muted/50"
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getAlertIcon(alert.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{alert.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>
              {!alert.read && (
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}