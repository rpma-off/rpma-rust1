import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { reportsIpc } from '../ipc/reports.ipc';
import type { InterventionReport } from '@/lib/backend/reports';

interface UseInterventionReportOptions {
  interventionId: string | null | undefined;
}

interface UseInterventionReportReturn {
  /** Latest existing report for the intervention (null while loading or if none). */
  report: InterventionReport | null;
  /** True while checking for an existing report on mount. */
  loading: boolean;
  /** True while generating a new report. */
  generating: boolean;
  /** Generate (or regenerate) a report for the intervention. */
  generateReport: () => Promise<void>;
}

export function useInterventionReport({ interventionId }: UseInterventionReportOptions): UseInterventionReportReturn {
  const [report, setReport] = useState<InterventionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Fetch existing report on mount / when interventionId changes
  useEffect(() => {
    if (!interventionId) {
      setReport(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    reportsIpc
      .getByIntervention(interventionId)
      .then((data) => {
        if (!cancelled) setReport(data ?? null);
      })
      .catch((err) => {
        // Log unexpected errors; report may simply not exist yet
        console.warn('[useInterventionReport] Failed to fetch report:', err);
        if (!cancelled) setReport(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [interventionId]);

  const generateReport = useCallback(async () => {
    if (!interventionId) return;

    setGenerating(true);
    try {
      const newReport = await reportsIpc.generate(interventionId);
      setReport(newReport);
      toast.success(`Rapport ${newReport.report_number} généré avec succès`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de génération du rapport';
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }, [interventionId]);

  return { report, loading, generating, generateReport };
}
