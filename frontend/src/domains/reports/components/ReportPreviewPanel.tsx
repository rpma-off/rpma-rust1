'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ReportPreviewMeta } from './preview/ReportPreviewMeta';
import { ReportPreviewClientVehicle } from './preview/ReportPreviewClientVehicle';
import { ReportPreviewWorkConditions } from './preview/ReportPreviewWorkConditions';
import { ReportPreviewStepsList } from './preview/ReportPreviewStepsList';
import { ReportPreviewQuality } from './preview/ReportPreviewQuality';
import { ReportPreviewCustomerValidation } from './preview/ReportPreviewCustomerValidation';
import { ReportDownloadActions } from './preview/ReportDownloadActions';
import type { InterventionReportViewModel } from '../services/report-view-model.types';

interface ReportPreviewPanelProps {
  viewModel: InterventionReportViewModel | null;
  isLoading?: boolean;
  /** Required to enable download/export actions. */
  interventionId?: string | null;
  /** file_path from an already-generated InterventionReport (for direct PDF link). */
  reportFilePath?: string | null;
}

export function ReportPreviewPanel({ viewModel, isLoading, interventionId, reportFilePath }: ReportPreviewPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 py-4" data-testid="report-preview-loading">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    );
  }

  if (!viewModel) {
    return (
      <p className="text-sm text-muted-foreground italic py-4 text-center" data-testid="report-preview-empty">
        Données du rapport non disponibles.
      </p>
    );
  }

  return (
    <div className="space-y-6 py-2" data-testid="report-preview-panel">
      {/* Download bar — shown when interventionId is provided */}
      {interventionId && (
        <>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {viewModel.meta.reportNumber
                ? <>Rapport <span className="font-mono">{viewModel.meta.reportNumber}</span></>
                : <span className="italic">Aucun rapport généré — la prévisualisation utilise les données actuelles</span>
              }
            </p>
            <ReportDownloadActions
              interventionId={interventionId}
              reportFilePath={reportFilePath}
            />
          </div>
          <Separator />
        </>
      )}

      <ReportPreviewMeta meta={viewModel.meta} summary={viewModel.summary} />

      <ReportPreviewClientVehicle client={viewModel.client} vehicle={viewModel.vehicle} />

      <ReportPreviewWorkConditions
        workConditions={viewModel.workConditions}
        materials={viewModel.materials}
      />

      <ReportPreviewStepsList steps={viewModel.steps} />

      <ReportPreviewQuality quality={viewModel.quality} photos={viewModel.photos} />

      <ReportPreviewCustomerValidation customerValidation={viewModel.customerValidation} />
    </div>
  );
}
