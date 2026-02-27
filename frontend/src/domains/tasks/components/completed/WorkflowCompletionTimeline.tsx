import React from 'react';
import { CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PPF_STEP_CONFIG } from '@/domains/interventions/components/ppf/ppfWorkflow.config';

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
};

export function WorkflowCompletionTimeline({
  steps,
  expandedSteps,
  onToggleStep,
}: WorkflowCompletionTimelineProps) {
  const getStepIcon = (stepId: string) => {
    const config = PPF_STEP_CONFIG[stepId as keyof typeof PPF_STEP_CONFIG];
    return config?.icon || CheckCircle;
  };

  const formatCompletionTime = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
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
        const Icon = getStepIcon(step.id);
        const isExpanded = expandedSteps.has(step.id);
        const isCompleted = step.status === 'completed';

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

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-extrabold text-gray-900">
                        {PPF_STEP_CONFIG[step.id as keyof typeof PPF_STEP_CONFIG]?.label ||
                          step.title}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {isCompleted ? 'Terminé' : 'En cours'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {PPF_STEP_CONFIG[step.id as keyof typeof PPF_STEP_CONFIG]?.description}
                    </p>
                  </div>

                  {step.collected_data && (
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

            {isExpanded && step.collected_data && (
              <div className="mt-4 pl-14 border-t border-gray-100 pt-4">
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

  const getStepType = (stepId: string): 'preparation' | 'installation' | 'finalization' | 'inspection' | 'other' => {
    if (stepId.includes('preparation')) return 'preparation';
    if (stepId.includes('installation')) return 'installation';
    if (stepId.includes('finalization')) return 'finalization';
    if (stepId.includes('inspection')) return 'inspection';
    return 'other';
  };

  const stepType = getStepType(step.id);

  const renderPreparationDetails = () => {
    const environment = data.environment as Record<string, unknown> | null;
    const checklist = data.checklist as Record<string, boolean> | null;

    return (
      <div className="space-y-3">
        {environment && (
          <div className="grid grid-cols-2 gap-2">
            {environment.temp_celsius != null && (
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                <span className="text-2xl">🌡️</span>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-red-600">Température</div>
                  <div className="text-sm font-bold text-red-700">
                    {String(Number(environment.temp_celsius))}°C
                  </div>
                </div>
              </div>
            )}
            {environment.humidity_percent != null && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                <span className="text-2xl">💧</span>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-blue-600">Humidité</div>
                  <div className="text-sm font-bold text-blue-700">
                    {String(Number(environment.humidity_percent))}%
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {checklist && (
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-2">Étapes de préparation</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {Object.entries(checklist).map(([key, completed]) => (
                <div
                  key={key}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg text-sm',
                    completed ? 'bg-emerald-50' : 'bg-gray-50'
                  )}
                >
                  <span className={completed ? 'text-emerald-600' : 'text-gray-400'}>
                    {completed ? '✓' : '○'}
                  </span>
                  <span className={completed ? 'text-gray-900' : 'text-gray-500'}>
                    {key === 'wash' ? 'Lavage' :
                     key === 'clay_bar' ? 'Clay Bar' :
                     key === 'degrease' ? 'Dégraissage' :
                     key === 'masking' ? 'Masquage' : String(key)}
                  </span>
                </div>
              ))}
            </div>
           </div>
         )}

         {data.notes != null && (
           <div className="p-3 bg-gray-50 rounded-lg">
             <div className="text-xs font-semibold text-gray-700 mb-1">Notes</div>
             <div className="text-sm text-gray-600">{String(data.notes as string)}</div>
           </div>
         )}
       </div>
     );
   };

   const renderInstallationDetails = () => {
    const notes = data.notes as string | undefined;
    const photoUrls = data.photo_urls as string[] | undefined;

    return (
      <div className="space-y-3">
        {photoUrls && photoUrls.length > 0 && (
          <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg">
            <span className="text-2xl">📸</span>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-purple-600">
                Photos prises
              </div>
              <div className="text-sm font-bold text-purple-700">{photoUrls.length}</div>
            </div>
          </div>
        )}

        {notes != null && notes.length > 0 && (
           <div className="p-3 bg-gray-50 rounded-lg">
             <div className="text-xs font-semibold text-gray-700 mb-1">Notes</div>
             <div className="text-sm text-gray-600">{notes}</div>
           </div>
         )}
       </div>
     );
   };

   const renderFinalizationDetails = () => {
    const qcChecklist = data.qc_checklist as Record<string, boolean> | null;
    const customerSignature = data.customer_signature as Record<string, unknown> | null;

    return (
      <div className="space-y-3">
        {qcChecklist && (
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-2">Contrôle qualité</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {Object.entries(qcChecklist).map(([key, completed]) => (
                <div
                  key={key}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg text-sm',
                    completed ? 'bg-emerald-50' : 'bg-gray-50'
                  )}
                >
                  <span className={completed ? 'text-emerald-600' : 'text-gray-400'}>
                    {completed ? '✓' : '○'}
                  </span>
                  <span className={completed ? 'text-gray-900' : 'text-gray-500'}>
                    {key === 'edges_sealed' ? 'Bords scellés' :
                     key === 'no_bubbles' ? 'Aucune bulle' :
                     key === 'smooth_surface' ? 'Surface lisse' :
                     key === 'alignment_correct' ? 'Alignement correct' :
                     key === 'no_dust' ? 'Pas de poussière' : String(key)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

         {customerSignature && (
           <div className="p-3 bg-emerald-50 rounded-lg">
             <div className="text-xs font-semibold text-emerald-700 mb-2">
               Signature client
             </div>
              <div className="space-y-1 text-sm text-emerald-600">
                <div>
                  <span className="font-medium">Signataire:</span>{' '}
                  {String(customerSignature.signatory as string | undefined || 'N/A')}
                </div>
                {customerSignature.customer_comments != null && (
                   <div className="italic">
                     &quot;{String(customerSignature.customer_comments as string)}&quot;
                   </div>
                 )}
              </div>
            </div>
          )}

          {data.notes != null && (
             <div className="p-3 bg-gray-50 rounded-lg">
               <div className="text-xs font-semibold text-gray-700 mb-1">Notes</div>
               <div className="text-sm text-gray-600">{String(data.notes as string)}</div>
             </div>
           )}
       </div>
     );
   };

   const renderInspectionDetails = () => {
    const notes = data.notes as string | undefined;

     return (
       <div className="space-y-3">
         {notes != null && notes.length > 0 && (
           <div className="p-3 bg-blue-50 rounded-lg">
             <div className="text-xs font-semibold text-blue-700 mb-1">Observations</div>
             <div className="text-sm text-blue-600">{notes}</div>
           </div>
         )}
       </div>
     );
   };

  switch (stepType) {
    case 'preparation':
      return renderPreparationDetails();
    case 'installation':
      return renderInstallationDetails();
    case 'finalization':
      return renderFinalizationDetails();
    case 'inspection':
      return renderInspectionDetails();
    default:
      return null;
  }
}
