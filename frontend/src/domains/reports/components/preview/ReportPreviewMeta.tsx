'use client';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { InterventionReportViewModel } from '../../services/report-view-model.types';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completed: 'default',
  in_progress: 'secondary',
  pending: 'outline',
  paused: 'outline',
  cancelled: 'destructive',
};

interface ReportPreviewMetaProps {
  meta: InterventionReportViewModel['meta'];
  summary: InterventionReportViewModel['summary'];
}

export function ReportPreviewMeta({ meta, summary }: ReportPreviewMetaProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{meta.reportTitle}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {meta.reportNumber ? (
              <span className="font-mono">{meta.reportNumber}</span>
            ) : (
              <span className="italic">Aucun rapport généré</span>
            )}
            {' · '}Généré le {meta.generatedAt}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[summary.statusBadge] ?? 'outline'}>
          {summary.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Tâche</p>
          <p className="font-medium text-foreground font-mono">{meta.taskNumber}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Type</p>
          <p className="font-medium text-foreground">{summary.interventionType}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Technicien</p>
          <p className="font-medium text-foreground">{summary.technicianName}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avancement</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-muted rounded-full h-1.5">
              <div
                className="bg-primary rounded-full h-1.5 transition-all"
                style={{ width: `${summary.completionPercentage}%` }}
              />
            </div>
            <span className="text-xs font-medium text-foreground tabular-nums w-8 text-right">
              {Math.round(summary.completionPercentage)}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-6 text-sm">
        <div>
          <span className="text-muted-foreground">Durée estimée : </span>
          <span className="font-medium text-foreground">{summary.estimatedDuration}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Durée réelle : </span>
          <span className="font-medium text-foreground">{summary.actualDuration}</span>
        </div>
      </div>

      <Separator />
    </div>
  );
}
