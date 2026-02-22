import { interventionsIpc } from '@/domains/interventions';
import type {
  Intervention,
  InterventionStep,
  StartInterventionRequest,
  AdvanceStepRequest,
  SaveStepProgressRequest,
  FinalizeInterventionRequest,
  JsonValue,
  JsonObject,
} from '@/lib/backend';

export interface WorkflowStartOptions {
  taskId: string;
  intervention_number: string | null;
  ppf_zones: Array<string>;
  custom_zones: Array<string> | null;
  film_type: string;
  film_brand: string | null;
  film_model: string | null;
  weather_condition: string;
  lighting_condition: string;
  work_location: string;
  temperature: number | null;
  humidity: number | null;
  technician_id: string;
  assistant_ids: Array<string> | null;
  scheduled_start: string;
  estimated_duration: number;
  gps_coordinates: { latitude: number; longitude: number; accuracy?: number | null } | null;
  address: string | null;
  notes: string | null;
  customer_requirements: Array<string> | null;
  special_instructions: string | null;
}

export interface WorkflowStepData {
  interventionId: string;
  stepId: string;
  collected_data: JsonValue;
  photos: Array<string> | null;
  notes: string | null;
  quality_check_passed: boolean;
  issues: Array<string> | null;
}

export interface WorkflowStepSaveData {
  stepId: string;
  collected_data: JsonValue;
  notes: string | null;
  photos: Array<string> | null;
}

export interface WorkflowFinalizeData {
  interventionId: string;
  collected_data: JsonValue | null;
  photos: Array<string> | null;
  customer_satisfaction: number | null;
  quality_score: number | null;
  final_observations: Array<string> | null;
  customer_signature: string | null;
  customer_comments: string | null;
}

export const workflowIpc = {
  startWorkflow: async (options: WorkflowStartOptions, sessionToken: string) => {
    const startRequest: StartInterventionRequest = {
      task_id: options.taskId,
      intervention_number: options.intervention_number,
      ppf_zones: options.ppf_zones,
      custom_zones: options.custom_zones,
      film_type: options.film_type,
      film_brand: options.film_brand,
      film_model: options.film_model,
      weather_condition: options.weather_condition,
      lighting_condition: options.lighting_condition,
      work_location: options.work_location,
      temperature: options.temperature,
      humidity: options.humidity,
      technician_id: options.technician_id,
      assistant_ids: options.assistant_ids,
      scheduled_start: options.scheduled_start,
      estimated_duration: options.estimated_duration,
      gps_coordinates: options.gps_coordinates
        ? { ...options.gps_coordinates, accuracy: options.gps_coordinates.accuracy ?? null }
        : null,
      address: options.address,
      notes: options.notes,
      customer_requirements: options.customer_requirements,
      special_instructions: options.special_instructions,
    };

    const result = await interventionsIpc.start(startRequest, sessionToken);

    return {
      intervention: result.intervention as unknown as Intervention,
      steps: result.steps as unknown as InterventionStep[],
      message: 'Workflow started successfully'
    };
  },

  getWorkflowProgress: async (interventionId: string, sessionToken: string) => {
    const progress = await interventionsIpc.getProgress(interventionId, sessionToken);

    return {
      steps: progress.steps,
      progressPercentage: progress.progress_percentage,
      completedSteps: progress.steps.filter(s => s.step_status === 'completed').length,
      totalSteps: progress.steps.length,
      currentStep: progress.steps.find(s => s.step_status === 'in_progress') || null
    };
  },

  advanceWorkflowStep: async (data: WorkflowStepData, sessionToken: string) => {
    const advanceRequest: AdvanceStepRequest = {
      intervention_id: data.interventionId,
      step_id: data.stepId,
      collected_data: data.collected_data,
      notes: data.notes,
      photos: data.photos,
      quality_check_passed: data.quality_check_passed,
      issues: data.issues,
    };

    const result = await interventionsIpc.advanceStep(advanceRequest, sessionToken);

    return {
      step: result.step as unknown as InterventionStep,
      nextStep: result.next_step as unknown as InterventionStep | null,
      progressPercentage: result.progress_percentage,
      message: 'Step advanced successfully'
    };
  },

  getWorkflowDetails: async (interventionId: string, sessionToken: string) => {
    const intervention = await interventionsIpc.get(interventionId, sessionToken);

    return {
      intervention,
      currentStep: null,
      isCompleted: intervention.status === 'completed',
      canFinalize: intervention.status === 'in_progress'
    };
  },

  saveWorkflowStepProgress: async (data: WorkflowStepSaveData, sessionToken: string) => {
    const saveRequest: SaveStepProgressRequest = {
      step_id: data.stepId,
      collected_data: data.collected_data,
      notes: data.notes,
      photos: data.photos,
    };

    const step = await interventionsIpc.saveStepProgress(saveRequest, sessionToken);

    return {
      step,
      message: 'Step progress saved successfully'
    };
  },

  finalizeWorkflow: async (data: WorkflowFinalizeData, sessionToken: string) => {
    const finalizeRequest: FinalizeInterventionRequest = {
      intervention_id: data.interventionId,
      collected_data: data.collected_data,
      photos: data.photos,
      customer_satisfaction: data.customer_satisfaction,
      quality_score: data.quality_score,
      final_observations: data.final_observations,
      customer_signature: data.customer_signature,
      customer_comments: data.customer_comments,
    };

    const result = await interventionsIpc.finalize(finalizeRequest, sessionToken);

    return {
      intervention: result.intervention,
      metrics: result.metrics,
      message: 'Workflow finalized successfully'
    };
  },

  getWorkflowForTask: async (taskId: string, sessionToken: string) => {
    const result = await interventionsIpc.getActiveByTask(taskId, sessionToken);
    const intervention = result && typeof result === 'object' && 'intervention' in result
      ? (result as { intervention: Intervention | null }).intervention
      : null;

    return {
      intervention,
      isActive: intervention !== null
    };
  },

  getLatestWorkflowForTask: async (taskId: string, sessionToken: string) => {
    const result = await interventionsIpc.getLatestByTask(taskId, sessionToken);
    const intervention = result && typeof result === 'object' && 'intervention' in result
      ? (result as { intervention: Intervention | null }).intervention
      : null;

    return {
      intervention,
      hasWorkflow: intervention !== null
    };
  },

  getStepDetails: async (stepId: string, sessionToken: string) => {
    const step = await interventionsIpc.getStep(stepId, sessionToken);

    return {
      step,
      isCompleted: step.step_status === 'completed',
      isInProgress: step.step_status === 'in_progress',
      isPending: step.step_status === 'pending',
      hasFailedQualityCheck: !step.validation_score || step.validation_score < 70
    };
  },

  listActiveWorkflows: async (filters: {
    technician_id?: string;
    limit?: number;
  }, sessionToken: string) => {
    const result = await interventionsIpc.list({
      status: 'in_progress',
      ...filters
    }, sessionToken);

    return {
      workflows: result.interventions,
      total: result.total
    };
  },

  listCompletedWorkflows: async (filters: {
    technician_id?: string;
    limit?: number;
  }, sessionToken: string) => {
    const result = await interventionsIpc.list({
      status: 'completed',
      ...filters
    }, sessionToken);

    return {
      workflows: result.interventions,
      total: result.total
    };
  },

  updateWorkflow: async (interventionId: string, data: JsonObject, sessionToken: string) => {
    const intervention = await interventionsIpc.updateWorkflow(interventionId, data, sessionToken);

    return {
      intervention,
      message: 'Workflow updated successfully'
    };
  }
};
