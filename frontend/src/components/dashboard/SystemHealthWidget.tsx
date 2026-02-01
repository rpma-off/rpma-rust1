"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Database, Server, Wifi, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemHealthWidgetProps {
  className?: string;
}

export function SystemHealthWidget({ className }: SystemHealthWidgetProps) {
  // Mock system health data
  const systemHealth = {
    overall: 'healthy' as 'healthy' | 'warning' | 'error',
    components: [
      {
        name: 'Base de données',
        status: 'healthy' as 'healthy' | 'warning' | 'error',
        uptime: 99.9,
        icon: Database
      },
      {
        name: 'Serveur API',
        status: 'healthy' as 'healthy' | 'warning' | 'error',
        uptime: 99.5,
        icon: Server
      },
      {
        name: 'Connexion réseau',
        status: 'warning' as 'healthy' | 'warning' | 'error',
        uptime: 98.2,
        icon: Wifi
      },
      {
        name: 'Services système',
        status: 'healthy' as 'healthy' | 'warning' | 'error',
        uptime: 99.8,
        icon: Activity
      }
    ]
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Santé Système
        </CardTitle>
        <Badge className={getStatusColor(systemHealth.overall)}>
          {systemHealth.overall === 'healthy' ? 'Opérationnel' :
           systemHealth.overall === 'warning' ? 'Avertissement' : 'Erreur'}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {systemHealth.components.map((component, index) => {
            const Icon = component.icon;
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{component.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Uptime: {component.uptime}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Progress value={component.uptime} className="w-16 h-2" />
                  {getStatusIcon(component.status)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}