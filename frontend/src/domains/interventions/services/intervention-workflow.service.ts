// PPF Intervention Workflow Service
import type { ApiResponse } from '@/types/api';
import { ApiError } from '@/types/api';
import { interventionsIpc } from '../ipc/interventions.ipc';
import type { AdvanceStepRequest, FinalizeInterventionRequest, JsonValue, StartInterventionRequest } from '@/lib/backend';
import type { PPFIntervention } from './ppf';
import type { ListResponse } from '@/types/api';
export interface PPFInterventionData {
  id: string;
  client_id: string;
  technician_id: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_vin: string;
  created_at: Date;
  updated_at: Date;
  progress_percentage: number;
}

export interface PPFInterventionStep {
  id: string;
  intervention_id: string;
  step_number: number;
  step_name: string;
  step_type: string;
  required: boolean;
  duration_seconds: number;
  photo_count: number;
  started_at?: Date;
  completed_at?: Date;
  collected_data?: Record<string, unknown>;
}

export interface AdvanceStepDTO {
  interventionId: string;
  stepNumber: number;
  collected_data?: Record<string, unknown>;
}

export class InterventionWorkflowService {
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
        console.log('[InterventionWorkflow]', logData);
    }
  }

  static async startIntervention(
    taskId: string,
    data: object,
    sessionToken: string
  ): Promise<ApiResponse<unknown>> {
    const payload = data as Record<string, unknown>;
    this.log('startIntervention', { taskId, dataKeys: Object.keys(payload) });

    try {
      // CRITICAL FIX: Include taskId in the data payload as task_id
    const requestData = {
        ...payload,
        task_id: taskId,
        intervention_type: (payload.intervention_type as string | undefined) ?? 'ppf',
        priority: (payload.priority as string | undefined) ?? 'medium',
      };
      
      const validatedResponse = await interventionsIpc.start(requestData as unknown as StartInterventionRequest, sessionToken);

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

      return { success: false, error: error instanceof Error ? new ApiError(error.message, 'INTERNAL_ERROR') : new ApiError('Failed to start intervention', 'INTERNAL_ERROR'), data: undefined };
    }
  }

  static async getInterventionById(id: string, sessionToken: string): Promise<ApiResponse<PPFIntervention>> {
    this.log('getInterventionById', { id });

    try {
      const result = await interventionsIpc.get(id, sessionToken);

      // Map backend Intervention to frontend PPFIntervention format
      const intervention = result;
      const interventionRecord = intervention as Record<string, unknown>;
      const data: PPFIntervention = {
        id: intervention.id,
        taskId: (interventionRecord.task_id as string) || (interventionRecord.taskId as string) || '',
        steps: [], // Will be populated separately
        status: (() => {
          switch (intervention.status) {
            case 'in_progress': return 'in_progress';
            case 'pending': return 'pending';
            case 'paused': return 'pending';  // Map paused to pending for UI
            case 'completed': return 'completed';
            case 'cancelled': return 'completed';  // Map cancelled to completed for UI
            default: return 'pending';
          }
        })(),
        progress: intervention.completion_percentage,
        currentStep: intervention.current_step,
        createdAt: new Date(String(intervention.created_at)).toISOString(),
        updatedAt: new Date(String(intervention.updated_at)).toISOString(),
        technicianId: intervention.technician_id || undefined,
        clientId: intervention.client_id || undefined,
        vehicleMake: intervention.vehicle_make || undefined,
        vehicleModel: intervention.vehicle_model || undefined,
        vehicleYear: intervention.vehicle_year || 0,
        vehicleVin: intervention.vehicle_vin || '',
      };

      this.log('getInterventionById.success', { id, interventionId: data.id });
      return { success: true, data, error: undefined };
    } catch (error) {
      this.log('getInterventionById.error', { id, error: error instanceof Error ? error.message : 'Unknown error' }, 'error');
      return { success: false, error: error instanceof Error ? new ApiError(error.message, 'INTERNAL_ERROR') : new ApiError('Failed to get intervention', 'INTERNAL_ERROR'), data: undefined };
    }
  }

  static async getInterventionSteps(interventionId: string, sessionToken: string): Promise<ApiResponse<ListResponse<PPFInterventionStep>>> {
    this.log('getInterventionSteps', { interventionId });

    try {
      const result = await interventionsIpc.getProgress(interventionId, sessionToken);

      // Map backend InterventionStep to frontend PPFInterventionStep format
      const data: PPFInterventionStep[] = result.steps.map((step: Record<string, unknown>) => ({
        id: String(step.id ?? ''),
        intervention_id: String(step.intervention_id ?? ''),
        step_number: Number(step.step_number ?? 0),
        step_name: String(step.step_name ?? ''),
        step_type: String(step.step_type ?? ''),
        required: Boolean(step.is_mandatory ?? false),
        duration_seconds: Number(step.duration_seconds ?? 0),
        photo_count: Number(step.photo_count ?? 0),
        started_at: step.started_at ? new Date(String(step.started_at)) : undefined,
        completed_at: step.completed_at ? new Date(String(step.completed_at)) : undefined,
        collected_data: (step.collected_data as Record<string, unknown>) || {},
      }));

      this.log('getInterventionSteps.success', { interventionId, stepCount: data.length });
      return {
        success: true,
        data: {
          data,
          pagination: { page: 1, limit: data.length, total: data.length, pageSize: data.length, totalPages: 1, hasNext: false, hasPrev: false },
          statistics: undefined
        },
        error: undefined
      };
    } catch (error) {
      this.log('getInterventionSteps.error', { interventionId, error: error instanceof Error ? error.message : 'Unknown error' }, 'error');
      return {
        success: false,
        error: error instanceof Error ? new ApiError(error.message, 'INTERNAL_ERROR') : new ApiError('Failed to get intervention steps', 'INTERNAL_ERROR'),
        data: undefined
      };
    }
  }

  static async getInterventions(_filters: unknown): Promise<ApiResponse<ListResponse<PPFIntervention>>> {
    try {
      // Mock implementation
      const data = [
        {
          id: 'intervention-1',
          taskId: 'task-1',
          steps: [],
          status: 'in_progress',
          progress: 50,
          currentStep: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          technician_id: 'tech-1',
          client_id: 'client-1',
          vehicle_make: 'Toyota',
          vehicle_model: 'Camry',
          vehicle_year: 2020,
          vehicle_vin: 'VIN123',
        },
      ];
      return {
        success: true,
        data: {
          data: data as PPFIntervention[],
          pagination: { page: 1, limit: 10, total: data.length, pageSize: 10, totalPages: 1, hasNext: false, hasPrev: false },
          statistics: undefined
        },
        error: undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? new ApiError(error.message, 'INTERNAL_ERROR') : new ApiError('Failed to get interventions', 'INTERNAL_ERROR'),
        data: undefined
      };
    }
  }

  static async advanceStep(interventionId: string, stepData: unknown, sessionToken: string): Promise<ApiResponse<unknown>> {
    try {
      const result = await interventionsIpc.advanceStep(stepData as AdvanceStepRequest, sessionToken);

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
      return { success: false, error: error instanceof Error ? new ApiError(error.message, 'INTERNAL_ERROR') : new ApiError('Failed to advance step', 'INTERNAL_ERROR'), data: undefined };
    }
  }

  static async finalizeIntervention(interventionId: string, finalData: unknown, sessionToken: string): Promise<ApiResponse<unknown>> {
    try {
      const result = await interventionsIpc.finalize(finalData as FinalizeInterventionRequest, sessionToken);

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
      return { success: false, error: error instanceof Error ? new ApiError(error.message, 'INTERNAL_ERROR') : new ApiError('Failed to finalize intervention', 'INTERNAL_ERROR'), data: undefined };
    }
  }

  static async pauseWorkflow(workflowId: string, userId: string, reason?: string, notes?: string): Promise<ApiResponse<void>> {
    try {
      // Mock implementation
      console.log('Pausing workflow', workflowId, userId, reason, notes);
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error instanceof Error ? new ApiError(error.message, 'INTERNAL_ERROR') : new ApiError('Failed to pause workflow', 'INTERNAL_ERROR'), data: undefined };
    }
  }

  static async resumeWorkflow(workflowId: string, userId: string, reason?: string): Promise<ApiResponse<void>> {
    try {
      // Mock implementation
      console.log('Resuming workflow', workflowId, userId, reason);
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error instanceof Error ? new ApiError(error.message, 'INTERNAL_ERROR') : new ApiError('Failed to resume workflow', 'INTERNAL_ERROR'), data: undefined };
    }
  }

  static async saveStepProgress(
    stepId: string,
    collectedData: unknown,
    sessionToken: string,
    notes?: string,
    photos?: string[]
  ): Promise<ApiResponse<unknown>> {
    const maxRetries = 2;
    const baseDelay = 1000; // 1 second
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        // Add timeout to the IPC call
        const result = await Promise.race([
          interventionsIpc.saveStepProgress({
            step_id: stepId,
            collected_data: collectedData as JsonValue,
            notes: notes || null,
            photos: photos || null
          }, sessionToken),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 25000) // 25s frontend timeout
          )
        ]);

        return { success: true, data: result, error: undefined };
      } catch (error) {
        console.error(`[DEBUG] saveStepProgress attempt ${attempt} failed:`, error);
        
        // If this is the last attempt, return the error
        if (attempt > maxRetries) {
          return { 
            success: false, 
            error: error instanceof Error ? new ApiError(error.message, 'TIMEOUT_ERROR') : new ApiError('Failed to save step progress after retries', 'TIMEOUT_ERROR'), 
            data: undefined 
          };
        }
        
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)));
      }
    }
    
    // This should never be reached, but TypeScript needs it
    return { success: false, error: new ApiError('Unexpected error in saveStepProgress', 'INTERNAL_ERROR'), data: undefined };
  }

  static async skipStep(workflowId: string, stepId: string, userId: string, reason?: string): Promise<ApiResponse<void>> {
    try {
      // Mock implementation
      console.log('Skipping step', workflowId, stepId, userId, reason);
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error instanceof Error ? new ApiError(error.message, 'INTERNAL_ERROR') : new ApiError('Failed to skip step', 'INTERNAL_ERROR'), data: undefined };
    }
  }

  static async getActive(sessionToken: string): Promise<Record<string, unknown>[]> {
    try {
      const result = await interventionsIpc.list(
        { status: 'in_progress' },
        sessionToken
      );
      return (result.interventions || []) as unknown as Record<string, unknown>[];
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get active interventions');
    }
  }

  static async getRecent(sessionToken: string, days: number = 7): Promise<Record<string, unknown>[]> {
    try {
      // Calculate date 7 days ago
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const result = await interventionsIpc.list(
        { status: 'completed', limit: 50 },
        sessionToken
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
