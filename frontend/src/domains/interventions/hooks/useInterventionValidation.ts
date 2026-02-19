import { useCallback } from 'react';
import type { PPFInterventionData, PPFInterventionStep } from '@/types/ppf-intervention';

interface UseInterventionValidationProps {
  intervention: PPFInterventionData | null;
  currentStep: PPFInterventionStep | null;
}

export function useInterventionValidation({
  intervention,
  currentStep,
}: UseInterventionValidationProps) {
  // Simple validation - all fields are optional
  const validateStep = useCallback((_step: PPFInterventionStep) => {
    return { isValid: true, errors: {} };
  }, []);

  const canProceedToNextStep = useCallback((_step: PPFInterventionStep) => {
    return true; // No mandatory validation
  }, []);

  const validateCurrentStep = useCallback(async () => {
    if (!currentStep) {
      return { isValid: false, errors: ['No current step available'] };
    }
    if (!intervention) {
      return { isValid: false, errors: ['No active intervention'] };
    }
    return { isValid: true, errors: [] };
  }, [currentStep, intervention]);

  const validateInterventionCompletion = useCallback(() => {
    if (!intervention) {
      return { isValid: false, errors: ['No intervention to validate'] };
    }

    const errors: string[] = [];

    // Check if all required steps are completed
    // This is a simplified validation - in a real app, you'd check each step's requirements

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [intervention]);

  return {
    validateStep,
    canProceedToNextStep,
    validateCurrentStep,
    validateInterventionCompletion,
  };
}