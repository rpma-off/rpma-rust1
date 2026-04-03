import React from 'react';
import { CheckCircle, ChevronDown, ChevronUp, Pencil, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTimeShort } from '@/shared/utils/date-formatters';
import { useTranslation } from '@/shared/hooks';

type WorkflowStepStatus = 'completed' | 'in_progress' | 'pending';

type WorkflowStep = {
  id: string;
  title: string;
  status: WorkflowStepStatus | string;
  completed_at?: string | null;
  collected_data?: Record<string, unknown> | null;
  step_data?: Record<string, unknown> | null;
  photo_urls?: string[] | null;
  notes?: string | null;
};

type WorkflowCompletionTimelineProps = {
  steps: WorkflowStep[];
  expandedSteps: Set<string>;
  onToggleStep: (stepId: string) => void;
  onEditStep?: (stepId: string) => void;
  onDownloadStep?: (stepId: string) => void;
};

const prettyKey = (key: string): string =>
  key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const countChecked = (record: Record<string, boolean> | null | undefined) => {
  if (!record) return { checked: 0, total: 0 };
  const entries = Object.entries(record);
  return {
    checked: entries.filter(([, value]) => Boolean(value)).length,
    total: entries.length,
  };
};

export function WorkflowCompletionTimeline({
  steps,
  expandedSteps,
  onToggleStep,
  onEditStep,
  onDownloadStep,
}: WorkflowCompletionTimelineProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const isExpanded = expandedSteps.has(step.id);
        const isCompleted = step.status === 'completed';
        const hasDetails = Boolean(
          (step.collected_data && Object.keys(step.collected_data).length > 0) ||
            (step.step_data && Object.keys(step.step_data).length > 0) ||
            (step.photo_urls && step.photo_urls.length > 0) ||
            step.notes
        );

        const stepMeta = t(`completed.steps.${step.id}.label`) || step.title;
        const stepDesc = t(`completed.steps.${step.id}.description`) || '';

        return (
          <div
            key={step.id}
            className={cn(
              'rounded-xl border bg-card p-4 transition-all',
              isCompleted ? 'border-success/30' : 'border-border'
            )}
          >
            <button
              type="button"
              onClick={() => onToggleStep(step.id)}
              className="flex w-full items-start gap-4 text-left"
              aria-expanded={isExpanded}
              aria-label={`${stepMeta} - ${isCompleted ? t('completed.stepCompleted') : t('completed.stepInProgress')}`}
            >
              <div
                className={cn(
                  'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all',
                  isCompleted
                    ? 'border-success bg-success text-white'
                    : 'border-border bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-bold">{index + 1}</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        {stepMeta}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                          isCompleted ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {isCompleted ? t('completed.stepCompleted') : t('completed.stepInProgress')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{stepDesc}</p>
                  </div>

                  {hasDetails && (
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>

                {isCompleted && step.completed_at && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground/60">
                    <CheckCircle className="h-3 w-3" />
                    {t('completed.stepCompleted')} le {formatDateTimeShort(step.completed_at)}
                  </div>
                )}

                <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                  {step.photo_urls && step.photo_urls.length > 0 && (
                    <span className="rounded-full bg-info/10 px-2 py-0.5 text-info">{step.photo_urls.length} photos</span>
                  )}
                  {step.notes && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">Notes saisies</span>
                  )}
                </div>
              </div>
            </button>

            <div className="mt-3 flex flex-wrap items-center gap-2 pl-14">
              {onEditStep && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                  onClick={(e) => { e.stopPropagation(); onEditStep(step.id); }}
                  aria-label={`${t('completed.editStep')} - ${stepMeta}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t('completed.editStep')}
                </button>
              )}
              {onDownloadStep && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                  onClick={(e) => { e.stopPropagation(); onDownloadStep(step.id); }}
                  aria-label={`${t('completed.downloadStepData')} - ${stepMeta}`}
                >
                  <Download className="h-3.5 w-3.5" />
                  {t('completed.downloadStepData')}
                </button>
              )}
            </div>

            {isExpanded && hasDetails && (
              <div className="mt-4 border-t border-border pt-4 pl-14 animate-slideDown">
                <WorkflowStepDetails step={step} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WorkflowStepDetails({ step }: { step: WorkflowStep }) {
  const { t } = useTranslation();
  const data = (step.collected_data ?? step.step_data ?? null) as Record<string, unknown> | null;
  const safeData = data ?? {};
  if (!data && (!step.photo_urls || step.photo_urls.length === 0) && !step.notes) return null;

  const rawJson = JSON.stringify(data ?? {}, null, 2);

  const renderInspection = () => {
    const checklist = (safeData.checklist as Record<string, boolean> | undefined) ?? undefined;
    const defects = (safeData.defects as Array<Record<string, unknown>> | undefined) ?? [];
    const environment = (safeData.environment as Record<string, unknown> | undefined) ?? undefined;
    const notes = typeof safeData.notes === 'string' ? safeData.notes : null;
    const checklistCounts = countChecked(checklist);

    return (
      <div className="space-y-3">
        {checklist && checklistCounts.total > 0 && (
          <div className="rounded-lg bg-success/10 p-2.5 text-xs text-success">
            {t('completed.stepDetails.checklist', { checked: checklistCounts.checked, total: checklistCounts.total })}
          </div>
        )}
        {Array.isArray(defects) && defects.length > 0 && (
          <div className="rounded-lg bg-warning/10 p-2.5 text-xs text-warning">
            {t('completed.stepDetails.defects', { count: defects.length })}
          </div>
        )}
        {environment && (
          <div className="grid grid-cols-2 gap-2">
            {environment.temp_celsius != null && (
              <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
                {t('completed.temperature')} : {String(environment.temp_celsius)}°C
              </div>
            )}
            {environment.humidity_percent != null && (
              <div className="rounded-lg bg-blue-50 p-2.5 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                {t('completed.humidity')} : {String(environment.humidity_percent)}%
              </div>
            )}
          </div>
        )}
        {notes && <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{notes}</div>}
        {step.photo_urls && step.photo_urls.length > 0 && (
          <div className="rounded-lg bg-info/10 p-2.5 text-xs text-info">{step.photo_urls.length} photos documentees</div>
        )}
      </div>
    );
  };

  const renderPreparation = () => {
    const surfaceChecklist = (safeData.surfaceChecklist as Record<string, boolean> | undefined) ?? undefined;
    const cutChecklist = (safeData.cutChecklist as Record<string, boolean> | undefined) ?? undefined;
    const materialsChecklist = (safeData.materialsChecklist as Record<string, boolean> | undefined) ?? undefined;
    const notes = typeof safeData.notes === 'string' ? safeData.notes : null;

    const surfaceCounts = countChecked(surfaceChecklist);
    const cutCounts = countChecked(cutChecklist);
    const materialsCounts = countChecked(materialsChecklist);

    return (
      <div className="space-y-2">
        {surfaceCounts.total > 0 && (
          <div className="rounded-lg bg-success/10 p-2.5 text-xs text-success">
            {t('completed.stepDetails.surfaceChecklist', { checked: surfaceCounts.checked, total: surfaceCounts.total })}
          </div>
        )}
        {cutCounts.total > 0 && (
          <div className="rounded-lg bg-purple-500/10 p-2.5 text-xs text-purple-600 dark:text-purple-400">
            {t('completed.stepDetails.cutChecklist', { checked: cutCounts.checked, total: cutCounts.total })}
          </div>
        )}
        {materialsCounts.total > 0 && (
          <div className="rounded-lg bg-info/10 p-2.5 text-xs text-info">
            {t('completed.stepDetails.materialsChecklist', { checked: materialsCounts.checked, total: materialsCounts.total })}
          </div>
        )}
        {notes && <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{notes}</div>}
        {step.photo_urls && step.photo_urls.length > 0 && (
          <div className="rounded-lg bg-info/10 p-2.5 text-xs text-info">{step.photo_urls.length} photos documentees</div>
        )}
      </div>
    );
  };

  const renderInstallation = () => {
    const zones = (safeData.zones as Array<Record<string, unknown>> | undefined) ?? [];
    const activeZoneId = typeof safeData.activeZoneId === 'string' ? safeData.activeZoneId : null;
    const notes = typeof safeData.notes === 'string' ? safeData.notes : null;

    const completed = zones.filter((zone) => zone.status === 'completed').length;
    const withPhotos = zones.filter((zone) => Array.isArray(zone.photos) && zone.photos.length > 0).length;
    const numericScores = zones
      .map((zone) => zone.quality_score)
      .filter((score): score is number => typeof score === 'number');
    const avgScore =
      numericScores.length > 0
        ? (numericScores.reduce((acc, score) => acc + score, 0) / numericScores.length).toFixed(1)
        : null;

    return (
      <div className="space-y-2">
        {zones.length > 0 && (
          <div className="rounded-lg bg-success/10 p-2.5 text-xs text-success">
            {t('completed.stepDetails.completedZones', { completed, total: zones.length })}
          </div>
        )}
        {zones.length > 0 && (
          <div className="rounded-lg bg-info/10 p-2.5 text-xs text-info">
            {t('completed.stepDetails.zonesWithPhotos', { withPhotos, total: zones.length })}
          </div>
        )}
        {avgScore && (
          <div className="rounded-lg bg-warning/10 p-2.5 text-xs text-warning">
            {t('completed.stepDetails.avgScore', { score: avgScore })}
          </div>
        )}
        {activeZoneId && (
          <div className="rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">
            {t('completed.stepDetails.activeZone', { zone: activeZoneId })}
          </div>
        )}
        {notes && <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{notes}</div>}
        {step.photo_urls && step.photo_urls.length > 0 && (
          <div className="rounded-lg bg-info/10 p-2.5 text-xs text-info">{step.photo_urls.length} photos documentees</div>
        )}
      </div>
    );
  };

  const renderFinalization = () => {
    const checklist =
      ((safeData.checklist as Record<string, boolean> | undefined) ??
        (safeData.qc_checklist as Record<string, boolean> | undefined)) ||
      undefined;
    const notes =
      (typeof safeData.notes === 'string' ? safeData.notes : null) ??
      (typeof safeData.customer_comments === 'string' ? safeData.customer_comments : null) ??
      step.notes;
    const checklistCounts = countChecked(checklist);
    const customerSatisfaction = typeof safeData.customer_satisfaction === 'number' ? safeData.customer_satisfaction : null;
    const qualityScore = typeof safeData.quality_score === 'number' ? safeData.quality_score : null;
    const customerSignature =
      safeData.customer_signature && typeof safeData.customer_signature === 'object'
        ? (safeData.customer_signature as Record<string, unknown>)
        : null;

    return (
      <div className="space-y-2">
        {checklist && checklistCounts.total > 0 && (
          <div className="rounded-lg bg-success/10 p-2.5 text-xs text-success">
            {t('completed.stepDetails.finalChecklist', { checked: checklistCounts.checked, total: checklistCounts.total })}
          </div>
        )}
        {notes && <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{notes}</div>}
        {customerSatisfaction !== null && (
          <div className="rounded-lg bg-warning/10 p-2.5 text-xs text-warning">Satisfaction client: {customerSatisfaction}/5</div>
        )}
        {qualityScore !== null && (
          <div className="rounded-lg bg-purple-500/10 p-2.5 text-xs text-purple-600 dark:text-purple-400">
            Score qualite final: {qualityScore}%
          </div>
        )}
        {Boolean(customerSignature?.svg_data) && (
          <div className="rounded-lg bg-info/10 p-2.5 text-xs text-info">Signature client capturee</div>
        )}
        {step.photo_urls && step.photo_urls.length > 0 && (
          <div className="rounded-lg bg-info/10 p-2.5 text-xs text-info">{step.photo_urls.length} photos documentees</div>
        )}
      </div>
    );
  };

  const renderRawFallback = () => (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">{t('completed.stepDetails.unrecognized')}</div>
      <pre className="max-h-64 overflow-auto rounded-lg bg-gray-900 p-3 text-[11px] text-gray-100 dark:bg-zinc-900">{rawJson}</pre>
    </div>
  );

  const rendererByStep: Record<string, () => React.ReactNode> = {
    inspection: renderInspection,
    preparation: renderPreparation,
    installation: renderInstallation,
    finalization: renderFinalization,
  };

  const rendered: React.ReactNode = rendererByStep[step.id]?.() ?? renderRawFallback();
  const shouldShowRaw = !rendererByStep[step.id];

  return (
    <div className="space-y-3">
      {rendered}
      {shouldShowRaw && (
        <details>
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">{t('completed.stepDetails.viewRawJson')}</summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-gray-900 p-3 text-[11px] text-gray-100 dark:bg-zinc-900">
            {Object.entries(safeData)
              .map(([key, value]) => `${prettyKey(key)}: ${JSON.stringify(value, null, 2)}`)
              .join('\n')}
          </pre>
        </details>
      )}
    </div>
  );
}
