export interface WorkflowExecution {
  id: string;
  workflowId: string;
  taskId: string;
  templateId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  currentStepId: string | null;
  steps: WorkflowExecutionStep[];
  startedAt?: string;
  completedAt?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWorkflowProgress {
  id: string;
  taskId: string;
  workflowId: string;
  currentStep: number;
  totalSteps: number;
  completionPercentage: number;
  estimatedTimeRemaining: number;
  status?: WorkflowStepStatus;
  started_at?: string;
  completed_at?: string | null;
}

export interface CreateWorkflowExecutionDTO {
  taskId: string;
  templateId: string;
}

export interface WorkflowTiming {
  id: string;
  stepId: string;
  workflowId: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  isPaused: boolean;
  pausedAt?: string;
  totalPausedSeconds: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompleteStepDTO {
  stepId: string;
  workflowId: string;
  data?: Record<string, unknown>;
  notes?: string;
  photos?: string[];
  checklistCompletion?: Record<string, boolean>;
  completedBy?: string;
}

export interface StartTimingDTO {
  workflowExecutionId: string;
  stepId: string;
  startedBy?: string;
}

export interface SignatureDTO {
  workflowExecutionId: string;
  stepId?: string;
  signature: string;
  userId?: string;
  signatureType?: SignatureType;
  ipAddress?: string;
  userAgent?: string;
}

export type WorkflowExecutionStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface WorkflowExecutionStep {
  id: string;
  workflowExecutionId: string;
  stepId: string;
  stepOrder: number;
  status: WorkflowStepStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  durationSeconds: number;
  data?: Record<string, unknown>;
  checklistCompletion: Record<string, unknown>;
  startedBy?: string | null;
  completedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  photos?: string[];
}

export interface WorkflowFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStepStatus;
  order: number;
  isRequired: boolean;
  data?: Record<string, unknown>;
}

export type WorkflowStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

export type SignatureType = 'complete' | 'partial' | 'initial';