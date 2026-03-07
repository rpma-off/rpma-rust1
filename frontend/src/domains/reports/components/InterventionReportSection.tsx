'use client';

import { FileText, Download, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useInterventionReport } from '../hooks/useInterventionReport';

interface InterventionReportSectionProps {
  interventionId: string | null | undefined;
}

export function InterventionReportSection({ interventionId }: InterventionReportSectionProps) {
  const { report, loading, generating, generateReport } = useInterventionReport({ interventionId });

  if (!interventionId) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <FileText className="w-4 h-4 text-accent" />
        Rapport d&apos;intervention
      </h3>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement…
        </div>
      ) : report ? (
        <div className="space-y-2">
          <div className="rounded-lg border border-[hsl(var(--rpma-border))] bg-background/50 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Numéro</span>
              <span className="font-mono font-medium text-foreground">{report.report_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Format</span>
              <span className="text-foreground uppercase">{report.format}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Généré le</span>
              <span className="text-foreground">
                {new Date(report.generated_at).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
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
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Voir PDF
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              disabled={generating}
              onClick={generateReport}
            >
              {generating ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              )}
              Regénérer
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Aucun rapport généré pour cette intervention.</p>
          <Button
            size="sm"
            disabled={generating}
            onClick={generateReport}
          >
            {generating ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5 mr-1.5" />
            )}
            {generating ? 'Génération…' : 'Générer le rapport'}
          </Button>
        </div>
      )}
    </div>
  );
}
