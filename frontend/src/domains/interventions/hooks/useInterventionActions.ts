import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthSecureStorage } from '@/lib/secureStorage';
import { InterventionWorkflowService } from '../services/intervention-workflow.service';
import {
  mapBackendStepToFrontend,
  mapBackendStepPartialUpdate,
  mapBackendInterventionToFrontend,
} from '../services/intervention-mappers';
import type { BackendStep, BackendIntervention } from '../services/intervention-mappers';
import { interventionKeys } from '@/lib/query-keys';
import { logger } from '@/lib/logging';
import { LogDomain } from '@/lib/logging/types';
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

      const mappedSteps = ((responseData.steps || []) as unknown as BackendStep[]).map(mapBackendStepToFrontend);

      onInterventionUpdate?.(responseData.intervention);
      onStepsUpdate?.(mappedSteps);
      onStepUpdate?.(mappedSteps.find(s => s.status === 'in_progress') ||
                    mappedSteps.find(s => s.step_number === responseData.intervention?.currentStep) ||
                    mappedSteps[0] || null);

      queryClient.invalidateQueries({ queryKey: interventionKeys.byTask(taskId || '') });
      queryClient.invalidateQueries({ queryKey: interventionKeys.activeForTask(taskId || '') });
    },
    onError: (err: Error) => {
      logger.error(LogDomain.TASK, 'PPF Workflow: Failed to create intervention', err, { task_id: taskId });
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
    onSuccess: (result) => {
      const responseData = (result as { data?: unknown }).data || result;
      const typedResponseData = responseData as StepProgressResponse;

      if (typedResponseData.next_step) {
        const backendStep = typedResponseData.next_step as unknown as BackendStep;
        onStepUpdate?.(mapBackendStepToFrontend(backendStep));
      } else if (typedResponseData.updated_step) {
        const backendUpdatedStep = typedResponseData.updated_step as unknown as BackendStep;
        const mappedUpdatedStep = mapBackendStepPartialUpdate(backendUpdatedStep);

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
      logger.error(LogDomain.TASK, 'PPF Workflow: Failed to advance step', err, {
        intervention_id: variables.intervention_id || variables.interventionId,
        step_number: variables.stepNumber,
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
      onInterventionUpdate?.(mapBackendInterventionToFrontend(backendIntervention, taskId ?? ''));
      queryClient.invalidateQueries({ queryKey: interventionKeys.byTask(taskId || '') });
      queryClient.invalidateQueries({ queryKey: interventionKeys.activeForTask(taskId || '') });
    },
    onError: (err: Error, variables) => {
      logger.error(LogDomain.TASK, 'PPF Workflow: Failed to finalize intervention', err, {
        intervention_id: variables.interventionId || variables.intervention_id,
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
