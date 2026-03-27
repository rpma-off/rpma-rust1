// PPF Intervention Workflow Service
import type { AdvanceStepRequest, FinalizeInterventionRequest, JsonValue, StartInterventionRequest } from '@/lib/backend';
import type { ApiResponse } from '@/types/api';
import { ApiError } from '@/types/api';
import type { ListResponse } from '@/types/api';
import type { PPFInterventionStep, AdvanceStepDTO } from '@/types/ppf-intervention';
import { interventionsIpc } from '../ipc/interventions.ipc';
import type { PPFIntervention } from './ppf';

export type { AdvanceStepDTO };

export class InterventionWorkflowService {
  private static readonly SAVE_STEP_PROGRESS_MAX_RETRIES = 2;
  private static readonly SAVE_STEP_PROGRESS_BASE_DELAY_MS = 1000;
  private static readonly SAVE_STEP_PROGRESS_TIMEOUT_MS = 25000;

  private static notImplemented<T>(message: string): ApiResponse<T> {
    return {
      success: false,
      error: new ApiError(message, 'NOT_IMPLEMENTED'),
      data: undefined
    };
  }

  private static toApiError(
    error: unknown,
    fallbackMessage: string,
    code: string = 'INTERNAL_ERROR',
  ): ApiError {
    return error instanceof Error
      ? new ApiError(error.message, code)
      : new ApiError(fallbackMessage, code);
  }

  private static log(operation: string, data: Record<string, unknown>, level: 'info' | 'warn' | 'error' = 'info') {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      operation,
      ...data
    };

    switch (level) {
      case 'error':
        console.error('[InterventionWorkflow]', logData);
        break;
      case 'warn':
        console.warn('[InterventionWorkflow]', logData);
        break;
      default:
        console.info('[InterventionWorkflow]', logData);
    }
  }

  private static buildStartRequest(
    taskId: string,
    payload: Record<string, unknown>,
  ): StartInterventionRequest {
    return {
      ...payload,
      task_id: taskId,
      intervention_type: (payload.intervention_type as string | undefined) ?? 'ppf',
      priority: (payload.priority as string | undefined) ?? 'medium',
    } as unknown as StartInterventionRequest;
  }

  private static mapInterventionStatus(status: string): PPFIntervention['status'] {
    switch (status) {
      case 'in_progress':
        return 'in_progress';
      case 'pending':
      case 'paused':
        return 'pending';
      case 'completed':
      case 'cancelled':
        return 'completed';
      default:
        return 'pending';
    }
  }

  private static toIsoString(value: unknown): string {
    return new Date(String(value)).toISOString();
  }

  private static mapIntervention(result: Record<string, unknown>): PPFIntervention {
    return {
      id: String(result.id ?? ''),
      taskId: String(result.task_id ?? result.taskId ?? ''),
      steps: [],
      status: this.mapInterventionStatus(String(result.status ?? 'pending')),
      progress: Number(result.completion_percentage ?? 0),
      currentStep: typeof result.current_step === 'number' ? result.current_step : undefined,
      createdAt: this.toIsoString(result.created_at),
      updatedAt: this.toIsoString(result.updated_at),
      technicianId: result.technician_id ? String(result.technician_id) : undefined,
      clientId: result.client_id ? String(result.client_id) : undefined,
      vehicleMake: result.vehicle_make ? String(result.vehicle_make) : undefined,
      vehicleModel: result.vehicle_model ? String(result.vehicle_model) : undefined,
      vehicleYear: typeof result.vehicle_year === 'number' ? result.vehicle_year : 0,
      vehicleVin: result.vehicle_vin ? String(result.vehicle_vin) : '',
    };
  }

  private static mapInterventionStep(
    step: Record<string, unknown>,
  ): PPFInterventionStep {
    return {
      id: String(step.id ?? ''),
      interventionId: String(step.intervention_id ?? ''),
      intervention_id: String(step.intervention_id ?? ''),
      stepNumber: Number(step.step_number ?? 0),
      step_number: Number(step.step_number ?? 0),
      step_name: String(step.step_name ?? ''),
      step_type: String(step.step_type ?? ''),
      status: step.step_status as PPFInterventionStep['status'],
      step_status: String(step.step_status ?? 'pending'),
      description: step.description as string | undefined,
      photos: [],
      startedAt: step.started_at ? String(step.started_at) : undefined,
      started_at: step.started_at ? String(step.started_at) : undefined,
      completedAt: step.completed_at ? String(step.completed_at) : undefined,
      completed_at: step.completed_at ? String(step.completed_at) : undefined,
      duration_seconds: Number(step.duration_seconds ?? 0),
      requires_photos: Boolean(step.requires_photos ?? false),
      min_photos_required: Number(step.min_photos_required ?? 0),
      photo_count: Number(step.photo_count ?? 0),
      quality_checkpoints: step.quality_checkpoints as PPFInterventionStep['quality_checkpoints'],
      qualityChecks: step.quality_checkpoints as PPFInterventionStep['qualityChecks'],
      approved_by: step.approved_by as string | undefined,
      observations: step.observations as string[] | undefined,
      collected_data: (step.collected_data as Record<string, unknown>) || {},
      paused_at: step.paused_at as number | null | undefined,
      created_at: step.created_at ? String(step.created_at) : undefined,
      updated_at: step.updated_at ? String(step.updated_at) : undefined,
      required: Boolean(step.is_mandatory ?? false),
    };
  }

  private static buildListPagination(
    total: number,
  ): ListResponse<PPFInterventionStep>['pagination'] {
    return {
      page: 1,
      limit: total,
      total,
      pageSize: total,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };
  }

  private static async saveStepProgressOnce(
    stepId: string,
    collectedData: unknown,
    notes?: string,
    photos?: string[],
  ): Promise<unknown> {
    return Promise.race([
      interventionsIpc.saveStepProgress({
        step_id: stepId,
        collected_data: collectedData as JsonValue,
        notes: notes || null,
        photos: photos || null
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Request timeout')),
          this.SAVE_STEP_PROGRESS_TIMEOUT_MS,
        )
      )
    ]);
  }

  private static async delay(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  static async startIntervention(
    taskId: string,
    data: object,
  ): Promise<ApiResponse<unknown>> {
    const payload = data as Record<string, unknown>;
    this.log('startIntervention', { taskId, dataKeys: Object.keys(payload) });

    try {
      // CRITICAL FIX: Include taskId in the data payload as task_id
      const requestData = this.buildStartRequest(taskId, payload);
      const validatedResponse = await interventionsIpc.start(requestData);

      this.log('startIntervention.success', {
        interventionId: validatedResponse.intervention.id,
        stepCount: validatedResponse.steps.length
      });

      // Map backend response to frontend format
      return {
        success: true,
        data: {
          success: true,
          intervention: validatedResponse.intervention,
          steps: validatedResponse.steps,
        },
        error: undefined
      };
    } catch (error) {
      console.error('Detailed intervention start error:', error);
      this.log('startIntervention.error', {
        taskId,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorDetails: error
      }, 'error');

      return {
        success: false,
        error: this.toApiError(error, 'Failed to start intervention'),
        data: undefined
      };
    }
  }

  static async getInterventionById(id: string): Promise<ApiResponse<PPFIntervention>> {
    this.log('getInterventionById', { id });

    try {
      const result = await interventionsIpc.get(id);
      const data = this.mapIntervention(result as Record<string, unknown>);

      this.log('getInterventionById.success', { id, interventionId: data.id });
      return { success: true, data, error: undefined };
    } catch (error) {
      this.log('getInterventionById.error', { id, error: error instanceof Error ? error.message : 'Unknown error' }, 'error');
      return {
        success: false,
        error: this.toApiError(error, 'Failed to get intervention'),
        data: undefined
      };
    }
  }

  static async getInterventionSteps(interventionId: string): Promise<ApiResponse<ListResponse<PPFInterventionStep>>> {
    this.log('getInterventionSteps', { interventionId });

    try {
      const result = await interventionsIpc.getProgress(interventionId);
      const data = result.steps.map((step: Record<string, unknown>) => this.mapInterventionStep(step));

      this.log('getInterventionSteps.success', { interventionId, stepCount: data.length });
      return {
        success: true,
        data: {
          data,
          pagination: this.buildListPagination(data.length),
          statistics: undefined
        },
        error: undefined
      };
    } catch (error) {
      this.log('getInterventionSteps.error', { interventionId, error: error instanceof Error ? error.message : 'Unknown error' }, 'error');
      return {
        success: false,
        error: this.toApiError(error, 'Failed to get intervention steps'),
        data: undefined
      };
    }
  }

  static async getInterventions(_filters: unknown): Promise<ApiResponse<ListResponse<PPFIntervention>>> {
    return this.notImplemented('Intervention list is not implemented in this service. Use interventionsIpc.list directly.');
  }

  static async getActiveByTask(taskId: string): Promise<ApiResponse<Record<string, unknown> | null>> {
    this.log('getActiveByTask', { taskId });
    try {
      const result = await interventionsIpc.getActiveByTask(taskId);
      return { success: true, data: result.intervention, error: undefined };
    } catch (error) {
      this.log('getActiveByTask.error', { taskId, error: error instanceof Error ? error.message : 'Unknown error' }, 'error');
      return {
        success: false,
        error: this.toApiError(error, 'Failed to get active intervention by task'),
        data: null
      };
    }
  }

  static async advanceStep(interventionId: string, stepData: unknown): Promise<ApiResponse<unknown>> {
    try {
      const result = await interventionsIpc.advanceStep(stepData as AdvanceStepRequest);

      // Map backend response to frontend format
      return {
        success: true,
        data: {
          success: true,
          step: result.step,
          next_step: result.next_step,
          intervention_progress: result.progress_percentage,
        },
        error: undefined
      };
    } catch (error) {
      return {
        success: false,
        error: this.toApiError(error, 'Failed to advance step'),
        data: undefined
      };
    }
  }

  static async finalizeIntervention(interventionId: string, finalData: unknown): Promise<ApiResponse<unknown>> {
    try {
      const result = await interventionsIpc.finalize(finalData as FinalizeInterventionRequest);

      // Map backend response to frontend format
      return {
        success: true,
        data: {
          success: true,
          intervention: result.intervention,
          completionSummary: result.metrics ? {
            totalTime: result.metrics.total_duration_minutes || 0,
            efficiencyRating: result.metrics.completion_rate || 0,
            qualityScore: result.metrics.quality_score || 0,
            certificatesGenerated: false,
          } : undefined,
        },
        error: undefined
      };
    } catch (error) {
      return {
        success: false,
        error: this.toApiError(error, 'Failed to finalize intervention'),
        data: undefined
      };
    }
  }

  static async pauseWorkflow(workflowId: string, userId: string, reason?: string, notes?: string): Promise<ApiResponse<void>> {
    this.log('pauseWorkflow.notImplemented', { workflowId, userId, reason, notes }, 'warn');
    return this.notImplemented('Pause workflow is not implemented by the backend IPC.');
  }

  static async resumeWorkflow(workflowId: string, userId: string, reason?: string): Promise<ApiResponse<void>> {
    this.log('resumeWorkflow.notImplemented', { workflowId, userId, reason }, 'warn');
    return this.notImplemented('Resume workflow is not implemented by the backend IPC.');
  }

  static async saveStepProgress(
    stepId: string,
    collectedData: unknown,
    notes?: string,
    photos?: string[]
  ): Promise<ApiResponse<unknown>> {
    for (
      let attempt = 1;
      attempt <= this.SAVE_STEP_PROGRESS_MAX_RETRIES + 1;
      attempt++
    ) {
      try {
        const result = await this.saveStepProgressOnce(
          stepId,
          collectedData,
          notes,
          photos,
        );

        return { success: true, data: result, error: undefined };
      } catch (error) {
        console.error(`[DEBUG] saveStepProgress attempt ${attempt} failed:`, error);

        if (attempt > this.SAVE_STEP_PROGRESS_MAX_RETRIES) {
          return {
            success: false,
            error: this.toApiError(
              error,
              'Failed to save step progress after retries',
              'TIMEOUT_ERROR',
            ),
            data: undefined
          };
        }

        await this.delay(
          this.SAVE_STEP_PROGRESS_BASE_DELAY_MS * Math.pow(2, attempt - 1),
        );
      }
    }

    return { success: false, error: new ApiError('Unexpected error in saveStepProgress', 'INTERNAL_ERROR'), data: undefined };
  }

  static async skipStep(workflowId: string, stepId: string, userId: string, reason?: string): Promise<ApiResponse<void>> {
    this.log('skipStep.notImplemented', { workflowId, stepId, userId, reason }, 'warn');
    return this.notImplemented('Skip step is not implemented by the backend IPC.');
  }

  static async getActive(): Promise<Record<string, unknown>[]> {
    try {
      const result = await interventionsIpc.list(
        { status: 'in_progress' },
      );
      return (result.interventions || []) as unknown as Record<string, unknown>[];
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get active interventions');
    }
  }

  static async getRecent(days: number = 7): Promise<Record<string, unknown>[]> {
    try {
      // Calculate date 7 days ago
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const result = await interventionsIpc.list(
        { status: 'completed', limit: 50 },
      );

      const recentInterventions = result.interventions.filter((intervention: Record<string, unknown>) => {
        const createdAt = new Date(String(intervention.created_at));
        return createdAt >= fromDate;
      });

      return recentInterventions as unknown as Record<string, unknown>[];
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get recent interventions');
    }
  }
}

export const interventionWorkflowService = InterventionWorkflowService;
