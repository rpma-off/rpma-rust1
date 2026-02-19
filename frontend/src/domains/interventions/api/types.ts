import type { StepType } from '@/lib/StepType';
import type {
  PPFInterventionData,
  PPFInterventionStep,
  StartInterventionDTO,
  AdvanceStepDTO,
  FinalizeInterventionDTO,
  InterventionCreationResponse,
  StepProgressResponse,
  InterventionFinalizationResponse,
} from '@/types/ppf-intervention';

export type PPFStepId = StepType;
export type PPFInterventionStepStatus = PPFInterventionStep['status'];

export type {
  PPFInterventionData,
  PPFInterventionStep,
  StartInterventionDTO,
  AdvanceStepDTO,
  FinalizeInterventionDTO,
  InterventionCreationResponse,
  StepProgressResponse,
  InterventionFinalizationResponse,
};

export type {
  WorkflowExecution,
  WorkflowExecutionStep,
  WorkflowStepStatus,
  TaskWorkflowProgress,
} from '@/types/workflow.types';
