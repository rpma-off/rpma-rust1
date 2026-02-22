import { workflowIpc } from '../ipc';
import type {
  WorkflowStepData,
  WorkflowStepSaveData,
  WorkflowFinalizeData,
  WorkflowStartOptions
} from '../ipc/workflow.ipc';
import type { Intervention, InterventionStep } from '@/lib/backend';

export interface WorkflowState {
  intervention: Intervention | null;
  currentStep: InterventionStep | null;
  progress: number;
  isCompleted: boolean;
  canAdvance: boolean;
  canFinalize: boolean;
}

export interface WorkflowMetrics {
  totalWorkflows: number;
  activeWorkflows: number;
  completedWorkflows: number;
  averageCompletionTime: number;
  stepSuccessRate: number;
  qualityPassRate: number;
}

export class WorkflowService {
  static async startWorkflow(
    options: WorkflowStartOptions,
    sessionToken: string
  ): Promise<WorkflowState> {
    const result = await workflowIpc.startWorkflow(options, sessionToken);

    const currentStep = result.steps.find(s => s.step_status === 'in_progress') || null;
    const progress = WorkflowService.calculateProgress(result.steps);

    return {
      intervention: result.intervention,
      currentStep,
      progress,
      isCompleted: false,
      canAdvance: currentStep !== null,
      canFinalize: progress === 100
    };
  }

  static async getWorkflowState(
    interventionId: string,
    sessionToken: string
  ): Promise<WorkflowState> {
    const result = await workflowIpc.getWorkflowDetails(interventionId, sessionToken);

    const progress = result.intervention ? WorkflowService.calculateProgress([]) : 0;

    return {
      intervention: result.intervention,
      currentStep: null,
      progress,
      isCompleted: result.isCompleted,
      canAdvance: false,
      canFinalize: result.canFinalize
    };
  }

  static async advanceStep(
    data: WorkflowStepData,
    sessionToken: string
  ): Promise<WorkflowState> {
    const result = await workflowIpc.advanceWorkflowStep(data, sessionToken);

    const progress = result.progressPercentage;
    const canAdvance = result.nextStep !== null;
    const canFinalize = progress === 100 && !canAdvance;

    return {
      intervention: null,
      currentStep: result.nextStep,
      progress,
      isCompleted: !canAdvance && canFinalize,
      canAdvance,
      canFinalize
    };
  }

  static async saveStepProgress(
    data: WorkflowStepSaveData,
    sessionToken: string
  ): Promise<{ success: boolean; step: InterventionStep }> {
    const result = await workflowIpc.saveWorkflowStepProgress(data, sessionToken);

    return {
      success: true,
      step: result.step
    };
  }

  static async finalizeWorkflow(
    data: WorkflowFinalizeData,
    sessionToken: string
  ): Promise<{ success: boolean; intervention: Intervention; metrics: { total_duration_minutes: number; completion_rate: number; quality_score: number | null; customer_satisfaction: number | null; steps_completed: number; total_steps: number; photos_taken: number } }> {
    const result = await workflowIpc.finalizeWorkflow(data, sessionToken);

    return {
      success: true,
      intervention: result.intervention,
      metrics: result.metrics
    };
  }

  static async getWorkflowForTask(
    taskId: string,
    sessionToken: string
  ): Promise<WorkflowState | null> {
    const result = await workflowIpc.getWorkflowForTask(taskId, sessionToken);

    if (!result.intervention) {
      return null;
    }

    const progress: number = 0;
    const currentStep = null;

    return {
      intervention: result.intervention,
      currentStep,
      progress,
      isCompleted: result.intervention.status === 'completed',
      canAdvance: currentStep !== null && result.intervention.status !== 'completed',
      canFinalize: progress >= 100 && result.intervention.status !== 'completed'
    };
  }

  static async getActiveWorkflows(
    filters: { technician_id?: string; limit?: number },
    sessionToken: string
  ): Promise<{ workflows: WorkflowState[]; total: number }> {
    const result = await workflowIpc.listActiveWorkflows(filters, sessionToken);

    const workflows = result.workflows.map(intervention => {
      const progress: number = 0;
      const currentStep = null;

      return {
        intervention,
        currentStep,
        progress,
        isCompleted: intervention.status === 'completed',
        canAdvance: currentStep !== null,
        canFinalize: false
      };
    });

    return {
      workflows,
      total: result.total
    };
  }

  static async getCompletedWorkflows(
    filters: { technician_id?: string; limit?: number },
    sessionToken: string
  ): Promise<{ workflows: WorkflowState[]; total: number }> {
    const result = await workflowIpc.listCompletedWorkflows(filters, sessionToken);

    const workflows = result.workflows.map(intervention => {
      const progress: number = 100;
      const currentStep = null;

      return {
        intervention,
        currentStep,
        progress,
        isCompleted: true,
        canAdvance: false,
        canFinalize: false
      };
    });

    return {
      workflows,
      total: result.total
    };
  }

  static async getWorkflowMetrics(
    sessionToken: string
  ): Promise<WorkflowMetrics> {
    const [activeResult, completedResult] = await Promise.all([
      workflowIpc.listActiveWorkflows({ limit: 1000 }, sessionToken),
      workflowIpc.listCompletedWorkflows({ limit: 1000 }, sessionToken)
    ]);

    const activeWorkflows = activeResult.total;
    const completedWorkflows = completedResult.total;
    const totalWorkflows = activeWorkflows + completedWorkflows;

    const allWorkflows = [...activeResult.workflows, ...completedResult.workflows];
    const averageCompletionTime = WorkflowService.calculateAverageCompletionTime(allWorkflows);
    const stepSuccessRate = WorkflowService.calculateStepSuccessRate(allWorkflows);
    const qualityPassRate = WorkflowService.calculateQualityPassRate(allWorkflows);

    return {
      totalWorkflows,
      activeWorkflows,
      completedWorkflows,
      averageCompletionTime,
      stepSuccessRate,
      qualityPassRate
    };
  }

  private static calculateProgress(steps: InterventionStep[]): number {
    if (!steps || steps.length === 0) return 0;

    const totalSteps = steps.length;
    const completedSteps = steps.filter(s => s.step_status === 'completed').length;
    const inProgressSteps = steps.filter(s => s.step_status === 'in_progress').length;

    return Math.round(((completedSteps + inProgressSteps * 0.5) / totalSteps) * 100);
  }

  private static calculateAverageCompletionTime(workflows: Intervention[]): number {
    if (workflows.length === 0) return 0;

    const completedWorkflows = workflows.filter(w => w.status === 'completed' && w.started_at && w.completed_at);

    if (completedWorkflows.length === 0) return 0;

    const totalTime = completedWorkflows.reduce((sum, workflow) => {
      const start = new Date(Number(workflow.started_at!)).getTime();
      const end = new Date(Number(workflow.completed_at!)).getTime();
      return sum + (end - start);
    }, 0);

    return Math.round(totalTime / completedWorkflows.length / 1000 / 60);
  }

  private static calculateStepSuccessRate(workflows: Intervention[]): number {
    if (workflows.length === 0) return 0;

    let totalSteps = 0;
    let successfulSteps = 0;

    workflows.forEach(workflow => {
      // Calculate from workflow metadata since steps aren't directly available
      totalSteps += workflow.id ? 1 : 0;
      successfulSteps += workflow.id ? 1 : 0;
    });

    return totalSteps > 0 ? Math.round((successfulSteps / totalSteps) * 100) : 0;
  }

  private static calculateQualityPassRate(workflows: Intervention[]): number {
    if (workflows.length === 0) return 0;

    let totalSteps = 0;
    let passedSteps = 0;

    workflows.forEach(workflow => {
      totalSteps += 1;
      if (workflow.status === 'completed') {
        passedSteps += 1;
      }
    });

    return totalSteps > 0 ? Math.round((passedSteps / totalSteps) * 100) : 0;
  }
}

export const workflowService = WorkflowService;
