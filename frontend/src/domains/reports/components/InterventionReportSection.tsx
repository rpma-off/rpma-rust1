'use client';

import { Download, FileText, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui';
import { formatDateTime } from '@/shared/utils/date-formatters';
import { useInterventionReport } from '../hooks/useInterventionReport';

interface InterventionReportSectionProps {
  interventionId: string | null | undefined;
  canGenerate: boolean;
}

export function InterventionReportSection({
  interventionId,
  canGenerate,
}: InterventionReportSectionProps) {
  const { report, loading, generating, generateReport } = useInterventionReport({
    interventionId,
  });

  if (!interventionId) return null;

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <FileText className="h-4 w-4 text-accent" />
        Rapport d&apos;intervention
      </h3>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement...
        </div>
      ) : report ? (
        <div className="space-y-2">
          <div className="space-y-1.5 rounded-lg border border-[hsl(var(--rpma-border))] bg-background/50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Numero</span>
              <span className="font-mono font-medium text-foreground">{report.report_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Format</span>
              <span className="uppercase text-foreground">{report.format}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Genere le</span>
              <span className="text-foreground">{formatDateTime(report.generated_at)}</span>
            </div>
            {report.technician_name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Technicien</span>
                <span className="text-foreground">{report.technician_name}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {report.file_path && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  const path = report.file_path;
                  if (!path) return;
                  const url = path.startsWith('file://') ? path : `file://${path}`;
                  window.open(url, '_blank');
                }}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Voir PDF
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              disabled={generating || !canGenerate}
              onClick={generateReport}
            >
              {generating ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              )}
              Regenerer
            </Button>
          </div>

          {!canGenerate && (
            <p className="text-xs text-muted-foreground">
              Le rapport ne peut etre regenere que lorsque la tache est terminee.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {canGenerate
              ? "Aucun rapport genere pour cette intervention."
              : "Le rapport sera disponible une fois la tache terminee."}
          </p>
          <Button size="sm" disabled={generating || !canGenerate} onClick={generateReport}>
            {generating ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="mr-1.5 h-3.5 w-3.5" />
            )}
            {generating ? 'Generation...' : 'Generer le rapport'}
          </Button>
        </div>
      )}
    </div>
  );
}
