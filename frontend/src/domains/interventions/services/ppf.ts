// PPF (Paint Protection Film) service
import type { PPFInterventionStep } from '@/types/ppf-intervention';
import { ApiError } from '@/types/api';
import { ipcClient } from '@/lib/ipc';
import { AuthSecureStorage } from '@/lib/secureStorage';
import type { JsonValue } from '@/lib/backend';

export interface PPFStep {
  id: string;
  stepName: string;
  step_name: string;
  step_status: string;
  required: boolean;
  status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
  requires_photos?: boolean;
  min_photos_required?: number;
  photos?: unknown[];
  step_number?: number;
  description?: string;
  estimatedDuration?: number;
  instructions?: string;
  photosRequired?: number;
  created_at: string;
  updated_at: string;
}

export interface PPFIntervention {
  id: string;
  taskId: string;
  steps: PPFInterventionStep[];
  status: 'pending' | 'in_progress' | 'completed' | 'finalizing';
  progress: number;
  currentStep?: number;
  completedStepsCount?: number;
  createdAt: string;
  updatedAt: string;
  technicianId?: string;
  clientId?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleVin?: string;
}

export class PPFService {
  private static async getSessionToken(): Promise<string> {
    const session = await AuthSecureStorage.getSession();
    if (!session.token) {
      throw new ApiError('Authentication required');
    }
    return session.token;
  }

  static async getIntervention(id: string): Promise<PPFIntervention | null> {
    try {
      const token = await this.getSessionToken();
      const intervention = await ipcClient.interventions.get(id, token);

      if (!intervention) return null;

      const raw = intervention as Record<string, unknown>;
      const steps = (raw.steps || []) as PPFInterventionStep[];

      return {
        id: String(raw.id || id),
        taskId: String(raw.task_id || ''),
        steps,
        status: (raw.status as PPFIntervention['status']) || 'pending',
        progress: typeof raw.progress_percentage === 'number' ? raw.progress_percentage : 0,
        currentStep: typeof raw.current_step === 'number' ? raw.current_step : undefined,
        completedStepsCount: typeof raw.completed_steps_count === 'number' ? raw.completed_steps_count : undefined,
        createdAt: String(raw.created_at || new Date().toISOString()),
        updatedAt: String(raw.updated_at || new Date().toISOString()),
        technicianId: raw.technician_id ? String(raw.technician_id) : undefined,
        clientId: raw.client_id ? String(raw.client_id) : undefined,
        vehicleMake: raw.vehicle_make ? String(raw.vehicle_make) : undefined,
        vehicleModel: raw.vehicle_model ? String(raw.vehicle_model) : undefined,
        vehicleYear: typeof raw.vehicle_year === 'number' ? raw.vehicle_year : undefined,
        vehicleVin: raw.vehicle_vin ? String(raw.vehicle_vin) : undefined,
      };
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : 'Failed to get PPF intervention');
    }
  }

  static async advanceIntervention(id: string, options?: {
    collected_data?: unknown;
    photos?: string[] | null;
    notes?: string | null;
    quality_check_passed?: boolean;
    issues?: string[] | null;
  }): Promise<PPFIntervention> {
    try {
      const token = await this.getSessionToken();

      // Get current progress to find the next step to advance
      const progressData = await ipcClient.interventions.getProgress(id, token);
      const steps = (progressData.steps || []) as Array<Record<string, unknown>>;

      const nextStep = steps.find(s => s.step_status !== 'completed');
      if (!nextStep) {
        throw new ApiError('All steps already completed');
      }

      await ipcClient.interventions.advanceStep({
        intervention_id: id,
        step_id: String(nextStep.id),
        collected_data: (options?.collected_data ?? null) as JsonValue,
        photos: options?.photos ?? null,
        notes: options?.notes ?? null,
        quality_check_passed: options?.quality_check_passed ?? true,
        issues: options?.issues ?? null,
      }, token);

      const intervention = await this.getIntervention(id);
      if (!intervention) throw new ApiError('Intervention not found after advancing');

      return intervention;
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : 'Failed to advance intervention');
    }
  }

  static async finalizeIntervention(id: string, options?: {
    collected_data?: unknown;
    photos?: string[] | null;
    customer_satisfaction?: number | null;
    quality_score?: number | null;
    final_observations?: string[] | null;
    customer_signature?: string | null;
    customer_comments?: string | null;
  }): Promise<PPFIntervention> {
    try {
      const token = await this.getSessionToken();

      await ipcClient.interventions.finalize({
        intervention_id: id,
        collected_data: (options?.collected_data ?? null) as JsonValue,
        photos: options?.photos ?? null,
        customer_satisfaction: options?.customer_satisfaction ?? null,
        quality_score: options?.quality_score ?? null,
        final_observations: options?.final_observations ?? null,
        customer_signature: options?.customer_signature ?? null,
        customer_comments: options?.customer_comments ?? null,
      }, token);

      const intervention = await this.getIntervention(id);
      if (!intervention) throw new ApiError('Intervention not found after finalizing');

      return intervention;
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : 'Failed to finalize intervention');
    }
  }

  static async getProgress(id: string): Promise<{ progress: number; currentStep: string }> {
    try {
      const token = await this.getSessionToken();
      const progressData = await ipcClient.interventions.getProgress(id, token);

      const steps = (progressData.steps || []) as Array<Record<string, unknown>>;
      const currentStep = steps.find(s => s.step_status !== 'completed');

      return {
        progress: progressData.progress_percentage || 0,
        currentStep: currentStep ? String(currentStep.step_name || 'Unknown') : 'Completed',
      };
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : 'Failed to get progress');
    }
  }

  static async getSteps(id: string): Promise<PPFStep[]> {
    try {
      const token = await this.getSessionToken();
      const progressData = await ipcClient.interventions.getProgress(id, token);

      return ((progressData.steps || []) as Array<Record<string, unknown>>).map(step => ({
        id: String(step.id || ''),
        stepName: String(step.step_name || ''),
        step_name: String(step.step_name || ''),
        step_status: String(step.step_status || 'pending'),
        required: step.required !== false,
        status: (step.step_status as PPFStep['status']) || 'pending',
        requires_photos: step.requires_photos as boolean | undefined,
        min_photos_required: step.min_photos_required as number | undefined,
        photos: step.photos as unknown[] | undefined,
        step_number: typeof step.step_number === 'number' ? step.step_number : (typeof step.stepNumber === 'number' ? step.stepNumber : undefined),
        description: step.description ? String(step.description) : undefined,
        estimatedDuration: typeof step.estimated_duration === 'number' ? step.estimated_duration : undefined,
        instructions: step.instructions ? String(step.instructions) : undefined,
        photosRequired: typeof step.photos_required === 'number' ? step.photos_required : undefined,
        created_at: String(step.created_at || new Date().toISOString()),
        updated_at: String(step.updated_at || new Date().toISOString()),
      }));
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : 'Failed to get steps');
    }
  }
}

export const ppfService = PPFService;

// Re-export the main InterventionWorkflowService from the dedicated file
export { InterventionWorkflowService, interventionWorkflowService } from './intervention-workflow.service';
