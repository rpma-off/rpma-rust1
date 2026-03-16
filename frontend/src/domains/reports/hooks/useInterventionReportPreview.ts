import { useQuery } from '@tanstack/react-query';
import { reportKeys } from '@/lib/query-keys';
import { useAuth } from '@/shared/hooks/useAuth';
// ❌ CROSS-DOMAIN IMPORT
import { interventionsIpc } from '@/domains/interventions';
import { reportsIpc } from '../ipc/reports.ipc';
import { buildInterventionReportViewModel } from '../services/buildInterventionReportViewModel';
import type { InterventionReportViewModel } from '../services/report-view-model.types';

interface UseInterventionReportPreviewOptions {
  interventionId: string | null | undefined;
}

interface UseInterventionReportPreviewReturn {
  viewModel: InterventionReportViewModel | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useInterventionReportPreview(
  { interventionId }: UseInterventionReportPreviewOptions,
): UseInterventionReportPreviewReturn {
  const { session } = useAuth();
  const token = session?.token ?? '';

  const query = useQuery({
    queryKey: reportKeys.preview(interventionId ?? ''),
    enabled: !!interventionId && !!token,
    retry: (failureCount, error) => {
      const msg = (error as Error)?.message ?? '';
      // Tauri arg validation errors are not transient — never retry
      if (msg.includes('invalid args') || msg.includes('missing required key')) return false;
      // Default to 2 retries for other errors in production
      return failureCount < 2;
    },
    retryDelay: 0,
    queryFn: async () => {
      const [intervention, progressResult, report] = await Promise.all([
        interventionsIpc.get(interventionId!),
        interventionsIpc.getProgress(interventionId!),
        reportsIpc.getByIntervention(interventionId!).catch(() => null),
      ]);

      return buildInterventionReportViewModel(
        intervention,
        progressResult.steps,
        report ?? null,
      );
    },
    select: (data) => data,
    staleTime: 5 * 60 * 1000,
  });

  return {
    viewModel: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
