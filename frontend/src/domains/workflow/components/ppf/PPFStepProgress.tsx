'use client';

import { useRouter } from 'next/navigation';
import { usePPFWorkflow } from '@/domains/interventions';
import { getPPFStepPath } from '@/domains/interventions/utils/ppf-workflow';
import { PPFStepProgress as SharedPPFStepProgress } from '@/shared/ui/ppf/PPFStepProgress';
import type { StepType } from '@/lib/StepType';

export function PPFStepProgress() {
  const router = useRouter();
  const { taskId, steps, currentStep, canAdvanceToStep } = usePPFWorkflow();

  return (
    <SharedPPFStepProgress
      steps={steps}
      currentStepId={currentStep?.id}
      canAdvanceToStep={(stepId: string) => canAdvanceToStep(stepId as StepType)}
      onStepNavigate={(stepId) => {
        router.push(`/tasks/${taskId}/workflow/ppf/${getPPFStepPath(stepId as StepType)}`);
      }}
    />
  );
}
