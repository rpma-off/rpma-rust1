import React from 'react';
import {
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Database
} from 'lucide-react';

interface SystemHealthWidgetProps {
  systemStatus: 'healthy' | 'warning' | 'critical';
  performance: number;
  uptime: number;
  lastBackup: string;
  nextBackup: string;
  activeAlerts: number;
  criticalAlerts: number;
}

const SystemHealthWidget: React.FC<SystemHealthWidgetProps> = ({
  systemStatus,
  performance,
  uptime,
  lastBackup,
  nextBackup,
  activeAlerts,
  criticalAlerts
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'critical':
        return <XCircle className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  return (
    <div className="bg-card rounded-lg shadow p-4 sm:p-6">
      <h3 className="text-lg font-medium text-foreground mb-4">
        Santé du système & Performance
      </h3>
      
      <div className="space-y-3 sm:space-y-4">
        {/* System Status */}
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center space-x-3">
            {getStatusIcon(systemStatus)}
            <div>
              <p className="font-medium text-foreground">Statut du système</p>
              <p className={`text-sm px-2 py-1 rounded-full inline-block ${getStatusColor(systemStatus)}`}>
                {systemStatus === 'healthy' ? 'Sain' : 
                 systemStatus === 'warning' ? 'Attention' : 'Critique'}
              </p>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="p-3 rounded-lg border bg-blue-50">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Performance</p>
                <p className="text-lg font-semibold text-blue-900">{performance}%</p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg border bg-green-50">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Disponibilité</p>
                <p className="text-lg font-semibold text-green-900">{uptime}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Backup Status */}
        <div className="p-3 rounded-lg border bg-purple-50">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-purple-600" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Sauvegarde</p>
              <div className="flex flex-col sm:flex-row sm:justify-between text-sm space-y-1 sm:space-y-0">
                <span>Dernière: {lastBackup}</span>
                <span>Prochaine: {nextBackup}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="p-3 rounded-lg border bg-orange-50">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Alertes actives</p>
              <div className="flex flex-col sm:flex-row sm:justify-between text-sm space-y-1 sm:space-y-0">
                <span className="text-orange-700">{activeAlerts} alertes</span>
                {criticalAlerts > 0 && (
                  <span className="text-red-700 font-medium">{criticalAlerts} critiques</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthWidget;
