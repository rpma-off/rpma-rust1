import { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { documentReportOperations } from '@/domains/documents';
import { interventionKeys } from '@/lib/query-keys';

export type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

interface PrintReportOptions {
  queryClient: QueryClient;
  taskId: string;
  interventionId: string;
  t: TranslateFn;
  onProgress: (progress: string) => void;
  onExported: () => void;
  onRetry: () => void;
}

export async function saveCompletedInterventionReport(
  interventionId: string,
  t: TranslateFn,
): Promise<void> {
  toast.info(t('reports.openingSaveDialog'));

  const response = await documentReportOperations.saveInterventionReport(interventionId);

  if (response.success && response.data) {
    toast.success(t('reports.pdfSavedSuccess', { path: response.data }));
    return;
  }

  throw new Error(t('reports.reportSaveFailed'));
}

export async function printCompletedInterventionReport({
  queryClient,
  taskId,
  interventionId,
  t,
  onProgress,
  onExported,
  onRetry,
}: PrintReportOptions): Promise<void> {
  toast.info(t('reports.generatingReport'), { duration: 3000 });
  onProgress(t('reports.generatingPdf'));

  await queryClient.invalidateQueries({ queryKey: interventionKeys.byTaskData(taskId) });
  await queryClient.refetchQueries({ queryKey: interventionKeys.byTaskData(taskId) });

  await new Promise((resolve) => setTimeout(resolve, 500));

  const response = await documentReportOperations.exportInterventionReport(interventionId, {
    maxRetries: 2,
    retryDelay: 1500,
  });

  if (!response.success || !response.data) {
    const errorMessage = response.error || t('reports.reportGenerationFailed');

    if (errorMessage.includes('Authentification')) {
      toast.error(t('errors.sessionExpired'));
    } else if (errorMessage.includes('autorisation') || errorMessage.includes('permission')) {
      toast.error(t('errors.noPermissionToExport'));
    } else if (errorMessage.includes('tentatives')) {
      toast.error(t('errors.exportFailedRetry'));
    } else {
      toast.error(t('errors.exportError', { message: errorMessage }));
    }

    throw new Error(errorMessage);
  }

  const reportData = response.data;
  if (!reportData.download_url && !reportData.file_path) {
    throw new Error(t('reports.reportGeneratedNoAccess'));
  }

  onProgress(t('reports.openingDocument'));
  onExported();

  const pdfUrl = reportData.download_url || `file://${reportData.file_path}`;
  const printWindow = window.open(pdfUrl, '_blank');

  if (!printWindow) {
    toast.error(t('reports.popupBlocked'), {
      duration: 8000,
      action: {
        label: t('common.retry'),
        onClick: onRetry,
      },
    });
    return;
  }

  printWindow.onload = () => {
    onProgress(t('reports.documentReadyForPrint'));
    toast.success(t('reports.reportOpenedSuccess'), { duration: 5000 });
  };

  printWindow.onerror = () => {
    toast.error(t('reports.pdfLoadError'));
  };

  setTimeout(() => {
    if (!printWindow.closed) {
      onProgress('');
      toast.success(t('reports.documentOpenedForPrint'));
    }
  }, 2000);
}

