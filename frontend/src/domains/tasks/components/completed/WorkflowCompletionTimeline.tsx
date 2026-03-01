import React from 'react';
import { CheckCircle, ChevronDown, ChevronUp, Pencil, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEP_META: Record<string, { label: string; description: string }> = {
  inspection: {
    label: 'Inspection',
    description: 'Etat du vehicule, defauts pre-existants, photos, conditions (temp/hum)',
  },
  preparation: {
    label: 'Preparation',
    description: 'Degraissage surface, decoupe du film, verification materiaux',
  },
  installation: {
    label: 'Installation',
    description: 'Pose du film PPF zone par zone avec controle qualite continu',
  },
  finalization: {
    label: 'Finalisation',
    description: 'Inspection finale, photos, notes et validation client',
  },
};

type WorkflowStepStatus = 'completed' | 'in_progress' | 'pending';

type WorkflowStep = {
  id: string;
  title: string;
  status: WorkflowStepStatus | string;
  completed_at?: string | null;
  collected_data?: Record<string, unknown> | null;
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
  const formatCompletionTime = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const isExpanded = expandedSteps.has(step.id);
        const isCompleted = step.status === 'completed';
        const hasDetails = Boolean(step.collected_data && Object.keys(step.collected_data).length > 0);

        return (
          <div
            key={step.id}
            className={cn(
              'rounded-xl border bg-white p-4 transition-all',
              isCompleted ? 'border-emerald-200' : 'border-gray-200'
            )}
          >
            <button
              type="button"
              onClick={() => onToggleStep(step.id)}
              className="flex w-full items-start gap-4 text-left"
            >
              <div
                className={cn(
                  'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all',
                  isCompleted
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-gray-300 bg-gray-100 text-gray-400'
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
                      <span className="text-sm font-extrabold text-gray-900">
                        {STEP_META[step.id]?.label || step.title}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                          isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {isCompleted ? 'Terminé' : 'En cours'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {STEP_META[step.id]?.description}
                    </p>
                  </div>

                  {hasDetails && (
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  )}
                </div>

                {isCompleted && step.completed_at && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400">
                    <CheckCircle className="h-3 w-3" />
                    Terminé le {formatCompletionTime(step.completed_at)}
                  </div>
                )}
              </div>
            </button>

            <div className="mt-3 flex flex-wrap items-center gap-2 pl-14">
              {onEditStep && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                  onClick={() => onEditStep(step.id)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Modifier l&apos;etape
                </button>
              )}
              {onDownloadStep && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                  onClick={() => onDownloadStep(step.id)}
                >
                  <Download className="h-3.5 w-3.5" />
                  Télécharger données
                </button>
              )}
            </div>

            {isExpanded && hasDetails && (
              <div className="mt-4 border-t border-gray-100 pt-4 pl-14">
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
  const data = step.collected_data as Record<string, unknown> | null;
  if (!data) return null;

  const rawJson = JSON.stringify(data, null, 2);

  const renderInspection = () => {
    const checklist = (data.checklist as Record<string, boolean> | undefined) ?? undefined;
    const defects = (data.defects as Array<Record<string, unknown>> | undefined) ?? [];
    const environment = (data.environment as Record<string, unknown> | undefined) ?? undefined;
    const notes = typeof data.notes === 'string' ? data.notes : null;
    const checklistCounts = countChecked(checklist);

    return (
      <div className="space-y-3">
        {checklist && checklistCounts.total > 0 && (
          <div className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700">
            Checklist: {checklistCounts.checked}/{checklistCounts.total}
          </div>
        )}
        {Array.isArray(defects) && defects.length > 0 && (
          <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">Défauts: {defects.length}</div>
        )}
        {environment && (
          <div className="grid grid-cols-2 gap-2">
            {environment.temp_celsius != null && (
              <div className="rounded-lg bg-red-50 p-2 text-xs text-red-700">
                Température: {String(environment.temp_celsius)}°C
              </div>
            )}
            {environment.humidity_percent != null && (
              <div className="rounded-lg bg-blue-50 p-2 text-xs text-blue-700">
                Humidité: {String(environment.humidity_percent)}%
              </div>
            )}
          </div>
        )}
        {notes && <div className="rounded-lg bg-gray-50 p-2 text-sm text-gray-700">{notes}</div>}
      </div>
    );
  };

  const renderPreparation = () => {
    const surfaceChecklist = (data.surfaceChecklist as Record<string, boolean> | undefined) ?? undefined;
    const cutChecklist = (data.cutChecklist as Record<string, boolean> | undefined) ?? undefined;
    const materialsChecklist = (data.materialsChecklist as Record<string, boolean> | undefined) ?? undefined;
    const notes = typeof data.notes === 'string' ? data.notes : null;

    const surfaceCounts = countChecked(surfaceChecklist);
    const cutCounts = countChecked(cutChecklist);
    const materialsCounts = countChecked(materialsChecklist);

    return (
      <div className="space-y-2">
        {surfaceCounts.total > 0 && (
          <div className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700">
            Surface checklist: {surfaceCounts.checked}/{surfaceCounts.total}
          </div>
        )}
        {cutCounts.total > 0 && (
          <div className="rounded-lg bg-violet-50 p-2 text-xs text-violet-700">
            Cut checklist: {cutCounts.checked}/{cutCounts.total}
          </div>
        )}
        {materialsCounts.total > 0 && (
          <div className="rounded-lg bg-sky-50 p-2 text-xs text-sky-700">
            Matériaux: {materialsCounts.checked}/{materialsCounts.total}
          </div>
        )}
        {notes && <div className="rounded-lg bg-gray-50 p-2 text-sm text-gray-700">{notes}</div>}
      </div>
    );
  };

  const renderInstallation = () => {
    const zones = (data.zones as Array<Record<string, unknown>> | undefined) ?? [];
    const activeZoneId = typeof data.activeZoneId === 'string' ? data.activeZoneId : null;
    const notes = typeof data.notes === 'string' ? data.notes : null;

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
          <div className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700">
            Zones terminées: {completed}/{zones.length}
          </div>
        )}
        {zones.length > 0 && (
          <div className="rounded-lg bg-indigo-50 p-2 text-xs text-indigo-700">
            Zones avec photos: {withPhotos}/{zones.length}
          </div>
        )}
        {avgScore && (
          <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">Score moyen: {avgScore}/10</div>
        )}
        {activeZoneId && (
          <div className="rounded-lg bg-gray-50 p-2 text-xs text-gray-600">Zone active: {activeZoneId}</div>
        )}
        {notes && <div className="rounded-lg bg-gray-50 p-2 text-sm text-gray-700">{notes}</div>}
      </div>
    );
  };

  const renderFinalization = () => {
    const checklist =
      ((data.checklist as Record<string, boolean> | undefined) ??
        (data.qc_checklist as Record<string, boolean> | undefined)) ||
      undefined;
    const notes =
      (typeof data.notes === 'string' ? data.notes : null) ??
      (typeof data.customer_comments === 'string' ? data.customer_comments : null);
    const checklistCounts = countChecked(checklist);

    return (
      <div className="space-y-2">
        {checklist && checklistCounts.total > 0 && (
          <div className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700">
            Checklist final: {checklistCounts.checked}/{checklistCounts.total}
          </div>
        )}
        {notes && <div className="rounded-lg bg-gray-50 p-2 text-sm text-gray-700">{notes}</div>}
      </div>
    );
  };

  const renderRawFallback = () => (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-gray-600">Structure non reconnue, affichage brut:</div>
      <pre className="max-h-64 overflow-auto rounded-lg bg-gray-900 p-3 text-[11px] text-gray-100">{rawJson}</pre>
    </div>
  );

  const rendererByStep: Record<string, () => React.ReactNode> = {
    inspection: renderInspection,
    preparation: renderPreparation,
    installation: renderInstallation,
    finalization: renderFinalization,
  };

  const rendered = rendererByStep[step.id]?.() ?? renderRawFallback();
  const shouldShowRaw = !rendererByStep[step.id];

  return (
    <div className="space-y-3">
      {rendered}
      {shouldShowRaw && (
        <details>
          <summary className="cursor-pointer text-xs font-semibold text-gray-600">Voir JSON brut</summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-gray-900 p-3 text-[11px] text-gray-100">
            {Object.entries(data)
              .map(([key, value]) => `${prettyKey(key)}: ${JSON.stringify(value, null, 2)}`)
              .join('\n')}
          </pre>
        </details>
      )}
    </div>
  );
}
