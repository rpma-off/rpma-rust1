// PPF (Paint Protection Film) service
import type { ApiResponse } from '@/types/api';
import type { PPFInterventionStep } from '@/types/ppf-intervention';
import { ApiError } from '@/types/api';
import { ipcClient } from '@/lib/ipc';

export interface PPFStep {
  id: string;
  stepName: string;
  step_name: string;
  step_status: string;
  required: boolean;
  status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
  requires_photos?: boolean;
  min_photos_required?: number;
  photos?: any[];
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
  static async getIntervention(id: string): Promise<PPFIntervention | null> {
    try {
      // Mock implementation
      return {
         id,
         taskId: 'task-1',
           steps: [
             {
               id: '1',
               interventionId: id,
               step_name: 'Preparation',
               stepNumber: 1,
               step_status: 'completed',
               step_type: 'preparation',
               status: 'completed',
               required: true,
             },
             {
               id: '2',
               interventionId: id,
               step_name: 'Application',
               stepNumber: 2,
               step_status: 'pending',
               step_type: 'installation',
               status: 'pending',
               required: true,
             },
             {
               id: '3',
               interventionId: id,
               step_name: 'Curing',
               stepNumber: 3,
               step_status: 'pending',
               step_type: 'finalization',
               status: 'pending',
               required: true,
             },
            ],
         status: 'in_progress',
         progress: 33,
         createdAt: new Date().toISOString(),
         updatedAt: new Date().toISOString(),
       };
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : 'Failed to get PPF intervention');
    }
  }

  static async advanceIntervention(id: string): Promise<PPFIntervention> {
    try {
      const intervention = await this.getIntervention(id);
      if (!intervention) throw new ApiError('Intervention not found');

      // Mock advancing to next step
      const nextIncompleteStep = intervention.steps.find(s => s.step_status !== 'completed');
      if (nextIncompleteStep) {
        nextIncompleteStep.step_status = 'completed';
        intervention.progress = Math.round((intervention.steps.filter(s => s.step_status === 'completed').length / intervention.steps.length) * 100);
      }

      return intervention;
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : 'Failed to advance intervention');
    }
  }

  static async finalizeIntervention(id: string): Promise<PPFIntervention> {
    try {
      const intervention = await this.getIntervention(id);
      if (!intervention) throw new ApiError('Intervention not found');

      intervention.status = 'completed';
      intervention.progress = 100;
       intervention.steps.forEach(step => step.step_status = 'completed');

      return intervention;
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : 'Failed to finalize intervention');
    }
  }

  static async getProgress(id: string): Promise<{ progress: number; currentStep: string }> {
    try {
      const intervention = await this.getIntervention(id);
      if (!intervention) throw new ApiError('Intervention not found');

      const currentStep = intervention.steps.find(s => s.step_status !== 'completed')?.step_name || 'Completed';

      return {
        progress: intervention.progress,
        currentStep,
      };
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : 'Failed to get progress');
    }
  }

  static async getSteps(id: string): Promise<PPFStep[]> {
    try {
      const intervention = await this.getIntervention(id);
      return (intervention?.steps || []).map(step => ({
        ...step,
        stepName: step.step_name,
        order: step.stepNumber,
      })) as PPFStep[];
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : 'Failed to get steps');
    }
  }
}

export const ppfService = PPFService;

// Re-export the main InterventionWorkflowService from the dedicated file
export { InterventionWorkflowService, interventionWorkflowService } from './ppf/intervention-workflow.service';