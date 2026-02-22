'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle, AlertCircle, User, FileText, Package, RefreshCw } from 'lucide-react';
import { useDashboard } from '../api';
import type { RecentActivity } from '../api/types';

export function RecentActivity() {
  const { recentActivity } = useDashboard();

  const getIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'task':
        return <Clock className="w-4 h-4" />;
      case 'intervention':
        return <CheckCircle className="w-4 h-4" />;
      case 'client':
        return <User className="w-4 h-4" />;
      case 'quote':
        return <FileText className="w-4 h-4" />;
      case 'inventory':
        return <Package className="w-4 h-4" />;
      case 'sync':
        return <RefreshCw className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getIconColor = (type: RecentActivity['type']) => {
    switch (type) {
      case 'task':
        return 'text-blue-500 bg-blue-500/10';
      case 'intervention':
        return 'text-green-500 bg-green-500/10';
      case 'client':
        return 'text-purple-500 bg-purple-500/10';
      case 'quote':
        return 'text-orange-500 bg-orange-500/10';
      case 'inventory':
        return 'text-cyan-500 bg-cyan-500/10';
      case 'sync':
        return 'text-indigo-500 bg-indigo-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <Card className="rpma-shell">
      <CardHeader>
        <CardTitle>Activité récente</CardTitle>
      </CardHeader>
      <CardContent>
        {recentActivity.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Aucune activité récente
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${getIconColor(activity.type)}`}>
                  {getIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{formatTime(activity.timestamp)}</span>
                    {activity.user && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{activity.user}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
