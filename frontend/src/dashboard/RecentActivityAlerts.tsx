'use client';

import React from 'react';
import {
  UserPlus,
  AlertTriangle,
  CheckCircle,
  FileText,
  Clock,
  Bell
} from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ActivityItem {
  id: string;
  type: 'user_registration' | 'quality_alert' | 'system_backup' | 'sop_update' | 'task_alert';
  title: string;
  description: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
}

interface RecentActivityAlertsProps {
  activities: ActivityItem[];
  onMarkAsRead?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

const RecentActivityAlerts: React.FC<RecentActivityAlertsProps> = ({
  activities,
  onMarkAsRead,
  onViewDetails
}) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration':
        return <UserPlus className="h-5 w-5 text-blue-600" />;
      case 'quality_alert':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'system_backup':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'sop_update':
        return <FileText className="h-5 w-5 text-purple-600" />;
      case 'task_alert':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-muted-foreground bg-muted/30';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'Critique';
      case 'high':
        return 'Élevée';
      case 'medium':
        return 'Moyenne';
      case 'low':
        return 'Faible';
      default:
        return 'Normale';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'À l\'instant';
    } else if (diffInHours < 24) {
      return `Il y a ${diffInHours}h`;
    } else {
      return date.toLocaleDateString('fr-FR');
    }
  };

  return (
    <div className="bg-card rounded-lg shadow p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-foreground">
          Activité récente & Alertes
        </h3>
        <div className="flex items-center space-x-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {activities.filter(a => !a.isRead).length} non lues
          </span>
        </div>
      </div>
      
      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
            <p>Aucune activité récente</p>
          </div>
        ) : (
          activities.slice(0, 5).map((activity) => (
            <div
              key={activity.id}
              className={`p-3 rounded-lg border-l-4 ${getPriorityColor(activity.priority)} ${
                !activity.isRead ? 'ring-2 ring-blue-200' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    <p className={`text-sm font-medium ${
                      !activity.isRead ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {activity.title}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        activity.priority === 'critical' ? 'bg-red-100 text-red-800' :
                        activity.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        activity.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {getPriorityText(activity.priority)}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-1">
                    {activity.description}
                  </p>
                  
                  <div className="flex items-center space-x-2 mt-2">
                    {onViewDetails && (
                      <Button
                        onClick={() => onViewDetails(activity.id)}
                        variant="ghost"
                        size="sm"
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Voir détails
                      </Button>
                    )}
                    {onMarkAsRead && !activity.isRead && (
                      <Button
                        onClick={() => onMarkAsRead(activity.id)}
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Marquer comme lu
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {activities.length > 5 && (
        <div className="mt-4 text-center">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Voir toutes les activités ({activities.length})
          </Button>
        </div>
      )}
    </div>
  );
};

export default RecentActivityAlerts;
