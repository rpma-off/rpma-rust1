'use client';

import { useRouter } from 'next/navigation';
import { usePPFWorkflow } from '@/domains/interventions';
import { PPFWorkflowHeader as SharedPPFWorkflowHeader } from '@/shared/ui/ppf/PPFWorkflowHeader';

export function PPFWorkflowHeader() {
  const router = useRouter();
  const { taskId, currentStep } = usePPFWorkflow();

  return (
    <SharedPPFWorkflowHeader
      taskId={taskId}
      currentStepTitle={currentStep?.title}
      onBack={(id) => router.push(`/tasks/${id}`)}
    />
  );
}
