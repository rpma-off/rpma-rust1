import React from 'react';
import {
  Database,
  Download,
  RefreshCw,
  Server,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/facade';
import type { SystemStats } from '@/domains/admin';
import { useTranslation } from '@/shared/hooks/useTranslation';

interface AdminSystemTabProps {
  stats: SystemStats;
}

export function AdminSystemTab({ stats }: AdminSystemTabProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="border-[hsl(var(--rpma-border))] bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Database className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
            {t('admin.database')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('common.size')}</span>
            <span className="text-foreground font-medium">{stats.databaseSize}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('admin.backup')}</span>
            <span className="text-foreground font-medium">{stats.lastBackup}</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" className="border-border/60 text-muted-foreground hover:bg-border/20">
              <Download className="h-4 w-4 mr-2" />
              {t('common.export')}
            </Button>
            <Button size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('admin.backup')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[hsl(var(--rpma-border))] bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Server className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
            {t('analytics.performance')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('common.availability')}</span>
            <span className="text-foreground font-medium">{stats.uptime}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('common.cpuLoad')}</span>
            <span className="text-green-400 font-medium">23%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('common.memory')}</span>
            <span className="text-yellow-400 font-medium">67%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
