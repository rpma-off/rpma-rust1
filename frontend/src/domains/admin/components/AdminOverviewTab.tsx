import React from 'react';
import {
  Activity,
  CheckCircle,
  Clock,
  Database,
  Plus,
  UserCheck,
  XCircle,
} from 'lucide-react';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/facade';
import { useTranslation } from '@/shared/hooks/useTranslation';
import type { RecentActivity, SystemStats } from '@/domains/admin';

interface DashboardStats {
  tasks?: unknown;
  clients?: unknown;
  users?: unknown;
  sync?: unknown;
}

interface AdminOverviewTabProps {
  stats: SystemStats;
  recentActivities: RecentActivity[];
  dashboardStats: DashboardStats | null;
  WorkflowExecutionDashboard?: React.ComponentType<{ taskStats: unknown }>;
  QualityAssuranceDashboard?: React.ComponentType<{ clientStats: unknown; userStats: unknown }>;
  PhotoDocumentationDashboard?: React.ComponentType<{ syncStats: unknown }>;
}

function getActivityIcon(type: RecentActivity['type']) {
  switch (type) {
    case 'user_login':
      return <UserCheck className="h-4 w-4 text-green-400" />;
    case 'task_created':
      return <Plus className="h-4 w-4 text-blue-400" />;
    case 'task_completed':
      return <CheckCircle className="h-4 w-4 text-emerald-400" />;
    case 'system_error':
      return <XCircle className="h-4 w-4 text-red-400" />;
    case 'backup_completed':
      return <Database className="h-4 w-4 text-purple-400" />;
    default:
      return <Activity className="h-4 w-4 text-gray-400" />;
  }
}

function getHealthColor(health: SystemStats['systemHealth']) {
  switch (health) {
    case 'healthy':
      return 'text-green-400 bg-green-500/20 border-green-500/30';
    case 'warning':
      return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    case 'critical':
      return 'text-red-400 bg-red-500/20 border-red-500/30';
  }
}

export function AdminOverviewTab({
  stats,
  recentActivities,
  dashboardStats,
  WorkflowExecutionDashboard,
  QualityAssuranceDashboard,
  PhotoDocumentationDashboard,
}: AdminOverviewTabProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <Card className="border-[hsl(var(--rpma-border))] bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Activity className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
              {t('admin.systemHealth')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('tasks.status')}</span>
              <Badge className={getHealthColor(stats.systemHealth)}>
                {stats.systemHealth === 'healthy' ? `✓ ${t('admin.systemHealth')}` :
                 stats.systemHealth === 'warning' ? `⚠ ${t('common.warning')}` : `✗ ${t('common.critical')}`}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('common.availability')}</span>
              <span className="text-foreground font-medium">{stats.uptime}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('admin.database')}</span>
              <span className="text-foreground font-medium">{stats.databaseSize}</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-[hsl(var(--rpma-border))] bg-white md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Clock className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
              {t('audit.activity')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-[hsl(var(--rpma-surface))] rounded-lg border border-[hsl(var(--rpma-border))]">
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium">{activity.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {activity.user && (
                        <span className="text-xs text-muted-foreground">{activity.user}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  </div>
                </div>
               ))}
             </div>
           </CardContent>
         </Card>
       </div>

        {/* Dashboard Components */}
        {WorkflowExecutionDashboard && QualityAssuranceDashboard && PhotoDocumentationDashboard && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <WorkflowExecutionDashboard taskStats={dashboardStats?.tasks} />
            <QualityAssuranceDashboard
              clientStats={dashboardStats?.clients}
              userStats={dashboardStats?.users}
            />
            <PhotoDocumentationDashboard syncStats={dashboardStats?.sync} />
          </div>
        )}
      </div>
  );
}
