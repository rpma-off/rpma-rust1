import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AuthSecureStorage } from '@/lib/secureStorage';
import { ipcClient } from '@/lib/ipc';
import { interventionKeys } from '@/lib/query-keys';
import type {
  PPFInterventionData,
  PPFInterventionStep,
  QualityCheckpointData,
} from '@/types/ppf-intervention';

interface UseInterventionSyncProps {
  taskId?: string;
  onInterventionLoaded?: (intervention: PPFInterventionData | null) => void;
  onStepsLoaded?: (steps: PPFInterventionStep[]) => void;
  onCurrentStepUpdate?: (step: PPFInterventionStep | null) => void;
}

export function useInterventionSync({
  taskId,
  onInterventionLoaded,
  onStepsLoaded,
  onCurrentStepUpdate,
}: UseInterventionSyncProps = {}) {
  // Load active intervention for current task
  const loadActiveInterventionQuery = useQuery<PPFInterventionData | null, Error, PPFInterventionData | null, (string | undefined)[]>({
    queryKey: interventionKeys.activeForTask(taskId || ''),
    queryFn: async ({ queryKey }) => {
      const currentTaskId = queryKey[1];
      if (!currentTaskId) {
        console.log('No taskId provided for active intervention query');
        return null;
      }

      try {
        const session = await AuthSecureStorage.getSession();
        const sessionToken = session.token;
        if (!sessionToken) {
          console.warn('No session token available for getActiveByTask', { taskId: currentTaskId });
          return null;
        }

        console.log('Fetching active intervention for task:', currentTaskId);

        // First get the full task details to ensure we have the correct UUID
        const taskResult = await ipcClient.tasks.get(currentTaskId, sessionToken);
        if (!taskResult) {
          throw new Error('Task not found');
        }

        // Use the task's UUID for intervention lookup
        const result = await ipcClient.interventions.getActiveByTask(taskResult.id, sessionToken);
        console.log('IPC result for active intervention:', result);

        // getActiveByTask now returns the tagged union directly
        const responseData = result as { type: string; intervention: Record<string, unknown> };

        if (responseData?.type === 'ActiveRetrieved' && responseData.intervention) {
          console.log('Successfully retrieved active intervention:', responseData.intervention.id);
          // Map backend Intervention to frontend PPFInterventionData
          const backendIntervention = responseData.intervention;
          const mappedIntervention: PPFInterventionData = {
            id: backendIntervention.id as string,
            taskId: backendIntervention.task_number as string,
            task_id: backendIntervention.task_number as string,
            intervention_number: backendIntervention.task_number as string,
            steps: [],
            status: backendIntervention.status as PPFInterventionData['status'],
            progress: backendIntervention.completion_percentage as number,
            progress_percentage: backendIntervention.completion_percentage as number,
            currentStep: backendIntervention.current_step as number,
            completion_percentage: backendIntervention.completion_percentage as number,
            createdAt: backendIntervention.created_at as string,
            created_at: backendIntervention.created_at as string | undefined,
            updatedAt: backendIntervention.updated_at as string,
            updated_at: backendIntervention.updated_at as string | undefined,
            technician_id: backendIntervention.technician_id as string | undefined,
            created_by: backendIntervention.created_by as string | undefined,
            client_id: backendIntervention.client_id as string | undefined,
            vehicle_make: backendIntervention.vehicle_make as string | undefined,
            vehicle_model: backendIntervention.vehicle_model as string | undefined,
            vehicle_year: backendIntervention.vehicle_year as number | undefined,
            vehicle_vin: backendIntervention.vehicle_vin as string | undefined,
            vehicle_info: backendIntervention.vehicle_make ? {
              make: backendIntervention.vehicle_make as string,
              model: backendIntervention.vehicle_model as string,
              year: backendIntervention.vehicle_year as number,
              vin: backendIntervention.vehicle_vin as string,
            } : undefined,
            weather_condition: backendIntervention.weather_condition as PPFInterventionData['weather_condition'],
            temperature_celsius: backendIntervention.temperature_celsius as number | undefined,
            started_at: backendIntervention.started_at as string | undefined,
            actual_start: backendIntervention.started_at as string | undefined,
            scheduled_start: backendIntervention.scheduled_at as string | undefined,
            completed_at: backendIntervention.completed_at as string | undefined,
            intervention_completed_at: backendIntervention.completed_at as string | undefined,
            estimated_duration: backendIntervention.estimated_duration as number | undefined,
            actual_duration: backendIntervention.actual_duration as number | undefined,
            gps_coordinates: backendIntervention.start_location_lat ? {
              latitude: backendIntervention.start_location_lat as number,
              longitude: backendIntervention.start_location_lon as number,
              accuracy: backendIntervention.start_location_accuracy as number,
            } : undefined,
            ppf_zones: backendIntervention.ppf_zones_config as string[] | undefined,
            notes: backendIntervention.notes as string | undefined,
          };
          return mappedIntervention;
        }
        console.log('No active intervention found for task:', currentTaskId);
        return null;
      } catch (error) {
        console.error('Error in loadActiveInterventionQuery:', {
          taskId: currentTaskId,
          error: error,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    },
    enabled: !!taskId,
  });

  // Load steps for the active intervention
  const loadInterventionStepsQuery = useQuery<PPFInterventionStep[], Error, PPFInterventionStep[], (string | undefined)[]>({
    queryKey: interventionKeys.steps(loadActiveInterventionQuery.data?.id || ''),
    queryFn: async ({ queryKey }) => {
      const interventionId = queryKey[1];
      if (!interventionId) {
        console.log('No interventionId provided for steps query');
        return [];
      }

      try {
        console.log('Fetching intervention steps for intervention:', interventionId);
        const session = await AuthSecureStorage.getSession();
        const sessionToken = session.token || '';
        const result = await ipcClient.interventions.getProgress(interventionId, sessionToken);
        console.log('IPC result for intervention steps:', result);

        if (result?.steps) {
          console.log('Raw steps data from backend:', result.steps);
          const mappedSteps = result.steps.map((step: Record<string, unknown>) => {
            console.log('Processing step:', step.id, 'collected_data:', step.collected_data, 'observations:', step.observations);
            return {
              id: step.id as string,
              interventionId: step.intervention_id as string,
              intervention_id: step.intervention_id as string,
              stepNumber: step.step_number as number,
              step_number: step.step_number as number,
              step_name: step.step_name as string,
              step_type: step.step_type as string,
              status: step.step_status as PPFInterventionStep['status'],
              step_status: step.step_status as string,
              description: step.description as string | undefined,
              photos: [],
              startedAt: step.started_at as string | undefined,
              started_at: step.started_at as string | undefined,
              completedAt: step.completed_at as string | undefined,
              completed_at: step.completed_at as string | undefined,
              duration_seconds: step.duration_seconds as number | undefined,
              requires_photos: step.requires_photos as boolean | undefined,
              min_photos_required: step.min_photos_required as number | undefined,
              photo_count: step.photo_count as number | undefined,
              quality_checkpoints: step.quality_checkpoints as QualityCheckpointData[] | undefined,
              qualityChecks: step.quality_checkpoints as QualityCheckpointData[] | undefined,
              approved_by: step.approved_by as string | undefined,
              observations: step.observations as string[] | undefined,
              collected_data: (step.collected_data || (step.observations ? { observations: step.observations } : {})) as Record<string, unknown>,
              paused_at: step.paused_at as number | null | undefined,
              created_at: step.created_at as string | undefined,
              updated_at: step.updated_at as string | undefined,
              required: !step.is_mandatory ? false : true,
            } satisfies PPFInterventionStep;
          });
          console.log('Successfully mapped intervention steps:', mappedSteps.length, 'steps');
          return mappedSteps;
        }
        console.log('No steps found in result for intervention:', interventionId);
        return [];
      } catch (error) {
        console.error('Failed to load intervention steps:', {
          interventionId,
          error: error,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : undefined
        });
        return [];
      }
    },
    enabled: !!loadActiveInterventionQuery.data?.id,
    retry: false,
  });

  // Update local state when data changes
  useEffect(() => {
    const interventionData = loadActiveInterventionQuery.data;
    const stepsData = loadInterventionStepsQuery.data;

    if (loadActiveInterventionQuery.isFetched) {
      onInterventionLoaded?.(interventionData || null);

      if (interventionData && interventionData.id && stepsData && stepsData.length > 0) {
        onStepsLoaded?.(stepsData);
        onCurrentStepUpdate?.(
          stepsData.find(s => s.step_status === 'in_progress') ||
          stepsData.find(s => s.step_number === interventionData.currentStep) ||
          null
        );
      } else {
        onStepsLoaded?.([]);
        onCurrentStepUpdate?.(null);
      }
    }
  }, [
    loadActiveInterventionQuery.data,
    loadActiveInterventionQuery.isFetched,
    loadInterventionStepsQuery.data,
    onInterventionLoaded,
    onStepsLoaded,
    onCurrentStepUpdate
  ]);

  return {
    // Queries
    loadActiveInterventionQuery,
    loadInterventionStepsQuery,

    // Computed state
    isLoading: loadActiveInterventionQuery.isLoading || loadInterventionStepsQuery.isLoading,
    error: loadActiveInterventionQuery.error || loadInterventionStepsQuery.error,
    hasIntervention: !!loadActiveInterventionQuery.data,
    hasSteps: !!loadInterventionStepsQuery.data?.length,
  };
}