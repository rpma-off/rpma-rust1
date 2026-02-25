'use client';

import { useRouter } from 'next/navigation';
import { usePPFWorkflow } from '../../../api/PPFWorkflowProvider';
import { getPPFStepPath } from '../../../utils/ppf-workflow';
import { PPFStepProgress as SharedPPFStepProgress } from '@/shared/ui/ppf/PPFStepProgress';

export function PPFStepProgress() {
  const router = useRouter();
  const { taskId, steps, currentStep, canAdvanceToStep } = usePPFWorkflow();

  return (
    <SharedPPFStepProgress
      steps={steps}
      currentStepId={currentStep?.id}
      canAdvanceToStep={canAdvanceToStep}
      onStepNavigate={(stepId) => {
        router.push(`/tasks/${taskId}/workflow/ppf/${getPPFStepPath(stepId)}`);
      }}
    />
  );
}
