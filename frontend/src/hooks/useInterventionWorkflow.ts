import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { handleErrorWithLogging } from '@/lib/utils/error-utils';
import { useInterventionState } from './useInterventionState';
import { useInterventionActions } from './useInterventionActions';
import { useInterventionSync } from './useInterventionSync';
import { useInterventionNavigation } from './useInterventionNavigation';
import { useInterventionValidation } from './useInterventionValidation';
import { useInterventionUtils } from './useInterventionUtils';
import type {
  PPFInterventionData,
  PPFInterventionStep,
  StartInterventionDTO,
  AdvanceStepDTO,
  FinalizeInterventionDTO,
} from '@/types/ppf-intervention';

interface UseInterventionWorkflowProps {
  taskId?: string;
  initialIntervention?: PPFInterventionData | null;
  onInterventionChange?: (intervention: PPFInterventionData) => void;
  onStepChange?: (step: PPFInterventionStep) => void;
  onError?: (error: string) => void;
}

export function useInterventionWorkflow({
  taskId,
  initialIntervention = null,
  onInterventionChange,
  onStepChange,
  onError
}: UseInterventionWorkflowProps = {}) {
  const queryClient = useQueryClient();

  // Error handling
  const handleError = useCallback((errorMessage: string, originalError?: unknown) => {
    handleErrorWithLogging(
      errorMessage,
      originalError,
      {
        taskId,
        interventionId: intervention?.id,
        component: 'PPF Workflow'
      },
      onError
    );
  }, [onError, taskId, intervention?.id]);

  // State management
  const state = useInterventionState({
    initialIntervention,
    onInterventionChange,
    onStepChange,
  });

  // Actions (mutations)
  const actions = useInterventionActions({
    taskId,
    onError: handleError,
    onInterventionUpdate: (intervention: PPFInterventionData | ((prev: PPFInterventionData | null) => PPFInterventionData | null)) => {
      if (typeof intervention === 'function') {
        // For function updates, we need to get current state and apply the function
        const currentIntervention = state.intervention;
        const result = intervention(currentIntervention);
        if (result) {
          state.updateIntervention(result);
        }
      } else {
        state.updateIntervention(intervention);
      }
    },
    onStepUpdate: state.updateCurrentStep,
    onStepsUpdate: (steps) => {
      if (typeof steps === 'function') {
        state.updateAllSteps(steps(state.allSteps));
      } else {
        state.updateAllSteps(steps);
      }
    },
  });

  // Data synchronization
  const sync = useInterventionSync({
    taskId,
    onInterventionLoaded: (intervention) => {
      if (intervention) {
        state.updateIntervention(intervention);
      }
    },
    onStepsLoaded: state.updateAllSteps,
    onCurrentStepUpdate: state.updateCurrentStep,
  });

  // Navigation helpers
  const navigation = useInterventionNavigation({
    currentStep: state.currentStep,
    allSteps: state.allSteps,
  });

  // Validation
  const validation = useInterventionValidation({
    intervention: state.intervention,
    currentStep: state.currentStep,
  });

  // Utilities
  const utils = useInterventionUtils({
    intervention: state.intervention,
    currentStep: state.currentStep,
    allSteps: state.allSteps,
  });

  // Enhanced actions with state updates
  const createIntervention = useCallback(async (data: StartInterventionDTO) => {
    const result = await actions.createInterventionMutation.mutateAsync(data);
    state.markAsSaved();
    return result;
  }, [actions.createInterventionMutation, state]);

  const advanceStep = useCallback(async (data: AdvanceStepDTO) => {
    const result = await actions.advanceStepMutation.mutateAsync(data);
    state.markAsSaved();
    return result;
  }, [actions.advanceStepMutation, state]);

  const finalizeIntervention = useCallback(async (data: FinalizeInterventionDTO) => {
    const result = await actions.finalizeInterventionMutation.mutateAsync(data);
    state.markAsSaved();
    return result;
  }, [actions.finalizeInterventionMutation, state]);

  // Reset function
  const reset = useCallback(() => {
    state.reset();
    queryClient.clear();
  }, [state, queryClient]);

  // Destructure state for cleaner return
  const { intervention, currentStep, allSteps, isDirty, lastSaved } = state;

  return {
    // State
    intervention,
    currentStep,
    allSteps,
    isLoading: sync.isLoading,
    error: sync.error,
    loadActiveInterventionQuery: sync.loadActiveInterventionQuery,
    loadInterventionStepsQuery: sync.loadInterventionStepsQuery,

    // Form state
    isDirty,
    lastSaved,

    // Actions
    createIntervention,
    advanceStep,
    finalizeIntervention,
    createInterventionMutation: actions.createInterventionMutation,
    advanceStepMutation: actions.advanceStepMutation,
    finalizeInterventionMutation: actions.finalizeInterventionMutation,

    // Navigation
    getCurrentStep: navigation.getCurrentStep,
    getStepByNumber: navigation.getStepByNumber,
    canNavigateToStep: navigation.canNavigateToStep,
    navigateToStep: navigation.navigateToStep,
    getNextStep: navigation.getNextStep,
    getPreviousStep: navigation.getPreviousStep,
    canGoNext: navigation.canGoNext,
    canGoPrevious: navigation.canGoPrevious,

    // Validation
    validateCurrentStep: validation.validateCurrentStep,
    validateStep: validation.validateStep,
    canProceedToNextStep: validation.canProceedToNextStep,
    validateInterventionCompletion: validation.validateInterventionCompletion,

    // Utilities
    getProgress: utils.getProgress,
    getTimeElapsed: utils.getTimeElapsed,
    isInterventionActive: utils.isInterventionActive,
    isInterventionCompleted: utils.isInterventionCompleted,
    isCurrentStepCompleted: utils.isCurrentStepCompleted,
    getCompletionStatus: utils.getCompletionStatus,

    // Reset
    reset,
  };
}