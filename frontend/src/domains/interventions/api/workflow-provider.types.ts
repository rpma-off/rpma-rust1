import type {
  CreateWorkflowExecutionDTO,
  SignatureType,
  TaskWorkflowProgress,
  WorkflowExecution,
  WorkflowExecutionStep,
  WorkflowStepStatus,
} from "@/types/workflow.types";
import type {
  JsonRecord,
  StringRecord,
  UnknownRecord,
} from "@/types/utility.types";

export interface StepData {
  notes?: string;
  photos?: string[];
  checklistCompletion?: StringRecord | Record<string, boolean>;
  customData?: JsonRecord;
}

export interface StepCompletionData {
  notes?: string;
  checklistCompletion?: Record<string, boolean>;
  [key: string]: unknown;
}

export interface StepStatusUpdateData extends UnknownRecord {
  notes?: string;
  completedAt?: string;
  updatedAt?: string;
}

export interface WorkflowContextType {
  workflow: WorkflowExecution | null;
  steps: WorkflowExecutionStep[];
  currentStep: WorkflowExecutionStep | null;
  progress: Record<string, TaskWorkflowProgress>;
  isLoading: boolean;
  error: { message: string; code?: string } | null;
  isFirstStep: boolean;
  isLastStep: boolean;
  loadWorkflow: (taskId: string) => Promise<void>;
  startWorkflow: (data: CreateWorkflowExecutionDTO) => Promise<void>;
  startStep: (stepId: string) => Promise<void>;
  completeStep: (stepId: string, data?: StepCompletionData) => Promise<void>;
  skipStep: (stepId: string, reason?: string) => Promise<void>;
  goToStep: (stepId: string) => Promise<void>;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  updateStepData: (stepId: string, data: StepData) => Promise<void>;
  updateStepStatus: (
    stepId: string,
    status: WorkflowStepStatus,
    data?: StepStatusUpdateData,
  ) => void;
  startTiming: (stepId: string) => Promise<void>;
  pauseTiming: (stepId: string) => Promise<void>;
  resumeTiming: (stepId: string) => Promise<void>;
  addSignature: (
    signatureType: SignatureType,
    signatureData: string,
  ) => Promise<void>;
  uploadPhotos: (stepId: string, files: File[]) => Promise<string[]>;
  isStepComplete: (stepId: string) => boolean;
  isStepInProgress: (stepId: string) => boolean;
  isStepSkipped: (stepId: string) => boolean;
  getStepProgress: (stepId: string) => TaskWorkflowProgress | undefined;
  getProgressPercentage: () => number;
  getCurrentStepIndex: () => number;
  canProceedToNextStep: () => boolean;
  resetWorkflow: () => void;
}
