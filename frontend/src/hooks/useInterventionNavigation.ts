import { useCallback } from 'react';
import type { PPFInterventionStep } from '@/types/ppf-intervention';

interface UseInterventionNavigationProps {
  currentStep: PPFInterventionStep | null;
  allSteps: PPFInterventionStep[];
}

export function useInterventionNavigation({
  currentStep,
  allSteps,
}: UseInterventionNavigationProps) {
  // Navigation helpers
  const getCurrentStep = useCallback(() => currentStep, [currentStep]);

  const getStepByNumber = useCallback((stepNumber: number) => {
    return allSteps.find(step => step.step_number === stepNumber) || null;
  }, [allSteps]);

  const canNavigateToStep = useCallback((step: PPFInterventionStep) => {
    return step.status === 'completed' || step.id === currentStep?.id;
  }, [currentStep]);

  const navigateToStep = useCallback((step: PPFInterventionStep) => {
    if (canNavigateToStep(step)) {
      return step;
    }
    return null;
  }, [canNavigateToStep]);

  const getNextStep = useCallback(() => {
    if (!currentStep || currentStep.step_number === undefined) return null;
    return getStepByNumber(currentStep.step_number + 1);
  }, [currentStep, getStepByNumber]);

  const getPreviousStep = useCallback(() => {
    if (!currentStep || currentStep.step_number === undefined) return null;
    return getStepByNumber(currentStep.step_number - 1);
  }, [currentStep, getStepByNumber]);

  const canGoNext = useCallback(() => {
    const nextStep = getNextStep();
    return nextStep ? canNavigateToStep(nextStep) : false;
  }, [getNextStep, canNavigateToStep]);

  const canGoPrevious = useCallback(() => {
    const prevStep = getPreviousStep();
    return prevStep ? canNavigateToStep(prevStep) : false;
  }, [getPreviousStep, canNavigateToStep]);

  return {
    // Current step
    getCurrentStep,
    getStepByNumber,

    // Navigation
    canNavigateToStep,
    navigateToStep,
    getNextStep,
    getPreviousStep,
    canGoNext,
    canGoPrevious,
  };
}