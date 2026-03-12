'use client';

import { useState } from 'react';
import { Download, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui';
import { documentReportOperations } from '@/shared/features/documents/report-export';

interface ReportDownloadActionsProps {
  interventionId: string;
  /** file_path from existing InterventionReport, if already generated. */
  reportFilePath: string | null | undefined;
}

export function ReportDownloadActions({ interventionId, reportFilePath }: ReportDownloadActionsProps) {
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleView = async () => {
    // If we already have a file path, open it directly.
    if (reportFilePath) {
      const url = reportFilePath.startsWith('file://') ? reportFilePath : `file://${reportFilePath}`;
      window.open(url, '_blank');
      return;
    }

    // Otherwise, export on demand.
    setOpening(true);
    try {
      const response = await documentReportOperations.exportInterventionReport(interventionId);
      if (!response.success || !response.data) {
        toast.error(response.error ?? 'Erreur lors de l\'ouverture du rapport');
        return;
      }
      const { download_url, file_path } = response.data;
      const url = download_url ?? (file_path ? `file://${file_path}` : null);
      if (!url) {
        toast.error('Impossible de localiser le fichier PDF');
        return;
      }
      const win = window.open(url, '_blank');
      if (!win) {
        toast.error('Ouverture bloquée par le navigateur. Autorisez les popups.', { duration: 6000 });
      }
    } catch {
      toast.error('Erreur lors de l\'ouverture du rapport');
    } finally {
      setOpening(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await documentReportOperations.saveInterventionReport(interventionId);
      if (response.success) {
        toast.success('Rapport sauvegardé avec succès');
      } else if (response.error && !response.error.includes('selectionne')) {
        toast.error(response.error);
      }
    } catch {
      toast.error('Erreur lors de la sauvegarde du rapport');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        size="sm"
        variant="outline"
        disabled={opening}
        onClick={handleView}
      >
        {opening ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : (
          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
        )}
        Voir PDF
      </Button>

      <Button
        size="sm"
        variant="outline"
        disabled={saving}
        onClick={handleSave}
      >
        {saving ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5 mr-1.5" />
        )}
        Télécharger
      </Button>
    </div>
  );
}
