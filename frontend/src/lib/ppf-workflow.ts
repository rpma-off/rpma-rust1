import type { StepType } from '@/lib/StepType';
import type { InterventionStep } from '@/lib/backend';

export type PPFStepMeta = {
  title: string;
  description: string;
  path: string;
};

export type PPFDerivedStepStatus = 'pending' | 'in_progress' | 'completed';

export type PPFDerivedStep = {
  id: StepType;
  title: string;
  description: string;
  status: PPFDerivedStepStatus;
  order: number;
};

export const PPF_STEP_META: Record<StepType, PPFStepMeta> = {
  inspection: {
    title: 'Inspection',
    description: 'Vehicle inspection and defect documentation',
    path: 'steps/inspection'
  },
  preparation: {
    title: 'Preparation',
    description: 'Surface preparation and setup',
    path: 'steps/preparation'
  },
  installation: {
    title: 'Installation',
    description: 'PPF application',
    path: 'steps/installation'
  },
  finalization: {
    title: 'Finalization',
    description: 'Quality control and completion',
    path: 'steps/finalization'
  }
};

export const DEFAULT_PPF_STEP_ORDER: StepType[] = [
  'inspection',
  'preparation',
  'installation',
  'finalization'
];

export const getPPFStepPath = (stepId: StepType): string => {
  return PPF_STEP_META[stepId]?.path ?? `steps/${stepId}`;
};

export const getPPFStepTitle = (stepId: StepType): string => {
  return PPF_STEP_META[stepId]?.title ?? stepId;
};

export const getPPFStepDescription = (stepId: StepType): string => {
  return PPF_STEP_META[stepId]?.description ?? '';
};

export const buildPPFStepsFromData = (stepsData?: InterventionStep[]): PPFDerivedStep[] => {
  if (stepsData && stepsData.length > 0) {
    return [...stepsData]
      .sort((a, b) => (a.step_number ?? 0) - (b.step_number ?? 0))
      .map((step, index) => {
        const status: PPFDerivedStepStatus =
          step.step_status === 'completed'
            ? 'completed'
            : step.step_status === 'in_progress'
              ? 'in_progress'
              : 'pending';

        return {
          id: step.step_type,
          title: getPPFStepTitle(step.step_type),
          description: getPPFStepDescription(step.step_type),
          status,
          order: step.step_number ?? index + 1
        };
      });
  }

  return DEFAULT_PPF_STEP_ORDER.map((stepId, index) => ({
    id: stepId,
    title: getPPFStepTitle(stepId),
    description: getPPFStepDescription(stepId),
    status: 'pending',
    order: index + 1
  }));
};

export const getCurrentPPFStepId = (
  stepsData: InterventionStep[] | undefined,
  interventionStatus: string | null | undefined
): StepType | null => {
  if (interventionStatus === 'completed') {
    return null;
  }

  if (stepsData && stepsData.length > 0) {
    const inProgressStep = stepsData.find(step => step.step_status === 'in_progress');
    if (inProgressStep) {
      return inProgressStep.step_type;
    }

    const pendingStep = stepsData.find(step => step.step_status === 'pending');
    if (pendingStep) {
      return pendingStep.step_type;
    }

    const allCompleted = stepsData.every(step => step.step_status === 'completed');
    if (allCompleted) {
      return null;
    }

    return stepsData[0]?.step_type ?? null;
  }

  return 'inspection';
};

export const getNextPPFStepId = (
  steps: Array<{ id: StepType }>,
  currentStepId: StepType
): StepType | null => {
  const currentIndex = steps.findIndex(step => step.id === currentStepId);
  if (currentIndex < 0) {
    return null;
  }
  return steps[currentIndex + 1]?.id ?? null;
};
