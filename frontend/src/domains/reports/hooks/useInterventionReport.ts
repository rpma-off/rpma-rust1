import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { reportsIpc } from '../ipc/reports.ipc';
import { reportKeys } from '@/lib/query-keys';
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
  generateReport: () => void;
}

export function useInterventionReport({ interventionId }: UseInterventionReportOptions): UseInterventionReportReturn {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: reportKeys.byIntervention(interventionId ?? ''),
    queryFn: () => reportsIpc.getByIntervention(interventionId!),
    enabled: !!interventionId,
    select: (data) => data ?? null,
  });

  const mutation = useMutation({
    mutationFn: () => reportsIpc.generate(interventionId!),
    onSuccess: (newReport) => {
      queryClient.setQueryData(reportKeys.byIntervention(interventionId ?? ''), newReport);
      void queryClient.invalidateQueries({ queryKey: reportKeys.preview(interventionId ?? '') });
      toast.success(`Rapport ${newReport.report_number} généré avec succès`);
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Erreur de génération du rapport';
      toast.error(message);
    },
  });

  return {
    report: query.data ?? null,
    loading: query.isLoading,
    generating: mutation.isPending,
    generateReport: () => {
      if (interventionId) mutation.mutate();
    },
  };
}
