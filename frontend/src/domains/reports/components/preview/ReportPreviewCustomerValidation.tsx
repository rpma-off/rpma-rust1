'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import type { InterventionReportViewModel } from '../../services/report-view-model.types';

interface ReportPreviewCustomerValidationProps {
  customerValidation: InterventionReportViewModel['customerValidation'];
}

export function ReportPreviewCustomerValidation({ customerValidation }: ReportPreviewCustomerValidationProps) {
  const isNoObs = customerValidation.comments === 'Aucune observation';

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Validation client</h3>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Satisfaction</p>
          <p className="font-semibold text-foreground text-base">{customerValidation.satisfaction}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Signature</p>
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            {customerValidation.signaturePresent ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Présente
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Absente</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-1">Commentaires client</p>
        {isNoObs ? (
          <p className="text-sm text-muted-foreground italic">Aucune observation</p>
        ) : (
          <p className="text-sm text-foreground">{customerValidation.comments}</p>
        )}
      </div>
    </div>
  );
}
