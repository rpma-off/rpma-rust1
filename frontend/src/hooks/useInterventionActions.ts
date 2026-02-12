import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthSecureStorage } from '@/lib/secureStorage';
import { InterventionWorkflowService } from '@/lib/services/ppf';
import { interventionKeys } from '@/lib/query-keys';
import type {
  PPFInterventionData,
  PPFInterventionStep,
  StartInterventionDTO,
  AdvanceStepDTO,
  FinalizeInterventionDTO,
  InterventionCreationResponse,
  StepProgressResponse,
  InterventionFinalizationResponse
} from '@/types/ppf-intervention';

interface BackendStep {
  id: string;
  intervention_id: string;
  step_number: number;
  step_name: string;
  step_type: string;
  step_status: string;
  description?: string;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  requires_photos?: boolean;
  min_photos_required?: number;
  photo_count?: number;
  quality_checkpoints?: Record<string, unknown>[];
  approved_by?: string;
  observations?: string[];
  collected_data?: Record<string, unknown>;
  paused_at?: number | null;
  created_at?: string;
  updated_at?: string;
  is_mandatory?: boolean;
}

interface BackendIntervention {
  id: string;
  task_number?: string;
  status: string;
  completion_percentage?: number;
  current_step?: number;
  currentStep?: number;
  created_at?: string;
  updated_at?: string;
  technician_id?: string;
  created_by?: string;
  client_id?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_vin?: string;
  weather_condition?: string;
  temperature_celsius?: number;
  started_at?: string;
  scheduled_at?: string;
  completed_at?: string;
  estimated_duration?: number;
  actual_duration?: number;
  start_location_lat?: number;
  start_location_lon?: number;
  start_location_accuracy?: number;
  ppf_zones_config?: string[];
  notes?: string;
}

interface UseInterventionActionsProps {
  taskId?: string;
  onError?: (error: string, originalError?: unknown) => void;
  onInterventionUpdate?: (intervention: PPFInterventionData | ((prev: PPFInterventionData | null) => PPFInterventionData | null)) => void;
  onStepUpdate?: (step: PPFInterventionStep | null) => void;
  onStepsUpdate?: (steps: PPFInterventionStep[] | ((prevSteps: PPFInterventionStep[]) => PPFInterventionStep[])) => void;
}

export function useInterventionActions({
  taskId,
  onError,
  onInterventionUpdate,
  onStepUpdate,
  onStepsUpdate,
}: UseInterventionActionsProps = {}) {
  const queryClient = useQueryClient();

  // Create intervention mutation
  const createInterventionMutation = useMutation<InterventionCreationResponse, Error, StartInterventionDTO>({
    mutationFn: async (data: StartInterventionDTO) => {
      const session = await AuthSecureStorage.getSession();
      const sessionToken = session.token;

      if (!sessionToken) {
        throw new Error('Vous devez être connecté pour démarrer une intervention');
      }

      const result = await InterventionWorkflowService.startIntervention(data.taskId!, data, sessionToken);

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to start intervention');
      }

      return result.data as InterventionCreationResponse;
    },
    onSuccess: (result) => {
      const responseData = (result as { data?: InterventionCreationResponse }).data || result;

      if (!responseData.intervention || !responseData.intervention.id) {
        onError?.('Invalid response: missing intervention data or id');
        return;
      }

      // Map backend steps to frontend format
      const mappedSteps = ((responseData.steps || []) as unknown as BackendStep[]).map((step: BackendStep) => ({
        id: step.id,
        interventionId: step.intervention_id,
        intervention_id: step.intervention_id,
        stepNumber: step.step_number,
        step_number: step.step_number,
        step_name: step.step_name,
        step_type: step.step_type,
        status: step.step_status,
        step_status: step.step_status,
        description: step.description,
        photos: [],
        startedAt: step.started_at,
        started_at: step.started_at,
        completedAt: step.completed_at,
        completed_at: step.completed_at,
        duration_seconds: step.duration_seconds,
        requires_photos: step.requires_photos,
        min_photos_required: step.min_photos_required,
        photo_count: step.photo_count,
        quality_checkpoints: step.quality_checkpoints,
        qualityChecks: step.quality_checkpoints,
        approved_by: step.approved_by,
        observations: step.observations,
        collected_data: step.collected_data || (step.observations ? { observations: step.observations } : {}),
        paused_at: step.paused_at,
        created_at: step.created_at,
        updated_at: step.updated_at,
        required: !step.is_mandatory ? false : true,
      })) as PPFInterventionStep[];

      onInterventionUpdate?.(responseData.intervention);
      onStepsUpdate?.(mappedSteps);
      onStepUpdate?.(mappedSteps.find(s => s.status === 'in_progress') ||
                    mappedSteps.find(s => s.step_number === responseData.intervention?.currentStep) ||
                    mappedSteps[0] || null);

      queryClient.invalidateQueries({ queryKey: interventionKeys.byTask(taskId || '') });
      queryClient.invalidateQueries({ queryKey: interventionKeys.activeForTask(taskId || '') });
    },
    onError: (err: Error) => {
      console.error('PPF Workflow: Failed to create intervention', { taskId, error: err.message });
      onError?.('Failed to create intervention', err);
    },
  });

  // Advance step mutation
  const advanceStepMutation = useMutation<StepProgressResponse, Error, AdvanceStepDTO>({
    mutationFn: async (data: AdvanceStepDTO) => {
      const intervention_id = data.intervention_id || data.interventionId;
      if (!intervention_id) {
        throw new Error('Intervention ID is required');
      }

      const session = await AuthSecureStorage.getSession();
      const sessionToken = session.token;

      if (!sessionToken) {
        throw new Error('Vous devez être connecté pour avancer une étape');
      }

      const apiData = {
        intervention_id,
        step_id: data.step_id || data.stepNumber?.toString(),
        collected_data: data.collected_data || data.data || {},
        photos: data.photo_urls,
        notes: data.observations?.join('; '),
        quality_check_passed: true,
        issues: data.observations?.filter(obs => obs.includes('issue')) || [],
      };

      const result = await InterventionWorkflowService.advanceStep(intervention_id, apiData, sessionToken);

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to advance step');
      }

      return result.data as StepProgressResponse;
    },
    onSuccess: (result, variables) => {
      const responseData = (result as { data?: unknown }).data || result;
      const typedResponseData = responseData as StepProgressResponse;

      if (typedResponseData.next_step) {
        const backendStep = typedResponseData.next_step as unknown as BackendStep;
        const mappedNextStep = {
          id: backendStep.id,
          interventionId: backendStep.intervention_id,
          intervention_id: backendStep.intervention_id,
          stepNumber: backendStep.step_number,
          step_number: backendStep.step_number,
          step_name: backendStep.step_name,
          step_type: backendStep.step_type,
          status: backendStep.step_status,
          step_status: backendStep.step_status,
          description: backendStep.description,
          photos: [],
          startedAt: backendStep.started_at,
          started_at: backendStep.started_at,
          completedAt: backendStep.completed_at,
          completed_at: backendStep.completed_at,
          duration_seconds: backendStep.duration_seconds,
          requires_photos: backendStep.requires_photos,
          min_photos_required: backendStep.min_photos_required,
          photo_count: backendStep.photo_count,
          quality_checkpoints: backendStep.quality_checkpoints,
          qualityChecks: backendStep.quality_checkpoints,
          approved_by: backendStep.approved_by,
          observations: backendStep.observations,
          collected_data: backendStep.collected_data || (backendStep.observations ? { observations: backendStep.observations } : {}),
          paused_at: backendStep.paused_at,
          created_at: backendStep.created_at,
          updated_at: backendStep.updated_at,
          required: !backendStep.is_mandatory ? false : true,
        } as PPFInterventionStep;
        onStepUpdate?.(mappedNextStep);
      } else if (typedResponseData.updated_step) {
        const backendUpdatedStep = typedResponseData.updated_step as unknown as BackendStep;
        const mappedUpdatedStep = {
          status: backendUpdatedStep.step_status,
          step_status: backendUpdatedStep.step_status,
          completedAt: backendUpdatedStep.completed_at,
          completed_at: backendUpdatedStep.completed_at,
          duration_seconds: backendUpdatedStep.duration_seconds,
          photo_count: backendUpdatedStep.photo_count,
          observations: backendUpdatedStep.observations,
          collected_data: backendUpdatedStep.collected_data || (backendUpdatedStep.observations ? { observations: backendUpdatedStep.observations } : {}),
          updated_at: backendUpdatedStep.updated_at,
        };

        // Update the specific step in allSteps
        onStepsUpdate?.((prevSteps: PPFInterventionStep[]) =>
          prevSteps.map((step: PPFInterventionStep) =>
            step.step_number === backendUpdatedStep.step_number
              ? { ...step, ...mappedUpdatedStep, status: 'completed' }
              : step
          )
        );
      }

      if (typedResponseData.intervention) {
        onInterventionUpdate?.((prev: PPFInterventionData | null) => prev ? {
          ...prev,
          currentStep: typedResponseData.intervention.currentStep,
          progress_percentage: typedResponseData.intervention.completion_percentage,
          updated_at: new Date().toISOString(),
        } : null);
      }

      queryClient.invalidateQueries({ queryKey: ['intervention', taskId] });
    },
    onError: (err: Error, variables) => {
      console.error('PPF Workflow: Failed to advance step', {
        interventionId: variables.intervention_id || variables.interventionId,
        currentStep: variables.stepNumber,
        error: err.message
      });
      onError?.('Failed to advance step', err);
    },
  });

  // Finalize intervention mutation
  const finalizeInterventionMutation = useMutation<InterventionFinalizationResponse, Error, FinalizeInterventionDTO>({
    mutationFn: async (data: FinalizeInterventionDTO) => {
      const intervention_id = data.interventionId || data.intervention_id;
      const session = await AuthSecureStorage.getSession();
      const sessionToken = session.token;

      if (!sessionToken) {
        throw new Error('Vous devez être connecté pour finaliser une intervention');
      }

      const apiData = {
        intervention_id,
        customer_satisfaction: data.customer_satisfaction,
        quality_score: data.quality_score,
        final_observations: data.final_observations,
        customer_signature: data.customer_signature,
        customer_comments: data.customer_comments,
      };

      const result = await InterventionWorkflowService.finalizeIntervention(intervention_id!, apiData, sessionToken);

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to finalize intervention');
      }

      return result.data as InterventionFinalizationResponse;
    },
    onSuccess: (result) => {
      const backendIntervention = result.intervention as unknown as BackendIntervention;
      const mappedIntervention = {
        id: backendIntervention.id,
        taskId: backendIntervention.task_number ?? taskId ?? '',
        task_id: backendIntervention.task_number,
        intervention_number: backendIntervention.task_number,
        steps: [],
        status: backendIntervention.status,
        progress: backendIntervention.completion_percentage ?? 0,
        progress_percentage: backendIntervention.completion_percentage,
        currentStep: backendIntervention.current_step ?? 0,
        completion_percentage: backendIntervention.completion_percentage,
        createdAt: backendIntervention.created_at ?? '',
        created_at: backendIntervention.created_at,
        updatedAt: backendIntervention.updated_at ?? '',
        updated_at: backendIntervention.updated_at,
        technician_id: backendIntervention.technician_id,
        created_by: backendIntervention.created_by,
        client_id: backendIntervention.client_id,
        vehicle_make: backendIntervention.vehicle_make,
        vehicle_model: backendIntervention.vehicle_model,
        vehicle_year: backendIntervention.vehicle_year,
        vehicle_vin: backendIntervention.vehicle_vin,
        vehicle_info: backendIntervention.vehicle_make ? {
          make: backendIntervention.vehicle_make,
          model: backendIntervention.vehicle_model,
          year: backendIntervention.vehicle_year,
          vin: backendIntervention.vehicle_vin,
        } : undefined,
        weather_condition: backendIntervention.weather_condition,
        temperature_celsius: backendIntervention.temperature_celsius,
        started_at: backendIntervention.started_at,
        actual_start: backendIntervention.started_at,
        scheduled_start: backendIntervention.scheduled_at,
        completed_at: backendIntervention.completed_at,
        intervention_completed_at: backendIntervention.completed_at,
        estimated_duration: backendIntervention.estimated_duration,
        actual_duration: backendIntervention.actual_duration,
        gps_coordinates: backendIntervention.start_location_lat != null && backendIntervention.start_location_lon != null ? {
          latitude: backendIntervention.start_location_lat,
          longitude: backendIntervention.start_location_lon,
          accuracy: backendIntervention.start_location_accuracy,
        } : undefined,
        ppf_zones: backendIntervention.ppf_zones_config,
        notes: backendIntervention.notes,
      } as PPFInterventionData;

      onInterventionUpdate?.(mappedIntervention);
      queryClient.invalidateQueries({ queryKey: interventionKeys.byTask(taskId || '') });
      queryClient.invalidateQueries({ queryKey: interventionKeys.activeForTask(taskId || '') });
    },
    onError: (err: Error, variables) => {
      console.error('PPF Workflow: Failed to finalize intervention', {
        interventionId: variables.interventionId || variables.intervention_id,
        error: err.message
      });
      onError?.('Failed to finalize intervention', err);
    },
  });

  return {
    createInterventionMutation,
    advanceStepMutation,
    finalizeInterventionMutation,
  };
}