/**
 * Pure mapping utilities for PPF intervention → WorkflowExecution conversion.
 * Extracted from WorkflowProvider to keep the provider focused on React state.
 */

import type {
  WorkflowExecution,
  WorkflowExecutionStep,
  WorkflowStepStatus,
  WorkflowExecutionStatus,
} from '@/types/workflow.types';
import type { PPFInterventionData } from '@/types/ppf-intervention';

export function mapPpfStepToWorkflowExecutionStep(
  step: NonNullable<PPFInterventionData['steps']>[number]
): WorkflowExecutionStep {
  return {
    id: step.id,
    workflowExecutionId: step.intervention_id || step.interventionId || '',
    stepId: step.id,
    stepOrder: step.step_number || step.stepNumber || 0,
    status: (step.status || 'pending') as WorkflowStepStatus,
    startedAt: step.started_at || step.startedAt || null,
    completedAt: step.completed_at || step.completedAt || null,
    durationSeconds: step.duration_seconds || 0,
    notes: step.description || undefined,
    photos: step.photos?.map(p => p.url) || [],
    checklistCompletion: (step.collected_data as Record<string, unknown>) || {},
    startedBy: step.approved_by || null,
    completedBy: step.approved_by || null,
    createdAt: step.created_at || '',
    updatedAt: step.updated_at || '',
    data: (step.collected_data as Record<string, unknown>) || {},
  };
}

export function mapPPFInterventionToWorkflowExecution(
  ppfIntervention: PPFInterventionData
): WorkflowExecution {
  const mappedSteps = (ppfIntervention.steps || []).map(mapPpfStepToWorkflowExecutionStep);
  const currentStep = mappedSteps.find(step => step.status === 'in_progress') || null;
  return {
    id: ppfIntervention.id,
    workflowId: ppfIntervention.id,
    taskId: ppfIntervention.taskId,
    templateId: 'ppf-workflow-template',
    status: ppfIntervention.status as unknown as WorkflowExecutionStatus,
    currentStepId: currentStep?.id || mappedSteps.find(step => step.status !== 'completed')?.id || null,
    steps: mappedSteps,
    startedAt: ppfIntervention.actual_start || ppfIntervention.scheduled_start || '',
    completedAt: ppfIntervention.intervention_completed_at || undefined,
    createdBy: ppfIntervention.created_by || '',
    updatedBy: ppfIntervention.created_by || '',
    createdAt: ppfIntervention.created_at || '',
    updatedAt: ppfIntervention.updated_at || '',
  };
}
