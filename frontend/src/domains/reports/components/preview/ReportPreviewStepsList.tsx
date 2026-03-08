'use client';

import { ReportPreviewStepCard } from './ReportPreviewStepCard';
import type { ReportStepViewModel } from '../../services/report-view-model.types';

interface ReportPreviewStepsListProps {
  steps: ReportStepViewModel[];
}

export function ReportPreviewStepsList({ steps }: ReportPreviewStepsListProps) {
  if (steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic text-center py-4">
        Aucune étape enregistrée.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Étapes du workflow ({steps.length})</h3>
      <div className="space-y-2">
        {steps.map((step) => (
          <ReportPreviewStepCard key={step.id} step={step} />
        ))}
      </div>
    </div>
  );
}
