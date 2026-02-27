import { useCallback } from 'react';
import { VehicleStep } from './steps/VehicleStep';
import { PPFStep } from './steps/PPFStep';
import { ScheduleStep } from './steps/ScheduleStep';
import { CustomerStep } from './steps/CustomerStep';
import { FormStep, ENHANCED_STEPS as STEPS_CONFIG, TaskFormData } from './types';

interface UseTaskFormStepsProps {
  currentStep: FormStep;
  stepsConfig: typeof STEPS_CONFIG;
  formData: TaskFormData;
  handleFormChange: (changes: Partial<TaskFormData>) => void;
  formErrors: Record<string, string>;
  loading: boolean;
  sessionToken: string | undefined;
  canProceedToNextStep: (step: FormStep) => boolean;
  setCurrentStep: (step: FormStep) => void;
  setFormErrors: (errors: Record<string, string>) => void;
  onStepComplete?: (step: FormStep) => void;
}

export const useTaskFormSteps = ({
  currentStep,
  stepsConfig,
  formData,
  handleFormChange,
  formErrors,
  loading,
  sessionToken,
  canProceedToNextStep,
  setCurrentStep,
  setFormErrors,
  onStepComplete
}: UseTaskFormStepsProps) => {
  const handleNextStep = useCallback(() => {
    const currentIndex = stepsConfig.findIndex(s => s.id === currentStep);
    if (currentIndex < stepsConfig.length - 1) {
      const nextStep = stepsConfig[currentIndex + 1];
      if (canProceedToNextStep(currentStep)) {
        setCurrentStep(nextStep.id);
        setFormErrors({});
        onStepComplete?.(currentStep);
      }
    }
  }, [currentStep, stepsConfig, canProceedToNextStep, setCurrentStep, setFormErrors, onStepComplete]);

  const handlePreviousStep = useCallback(() => {
    const currentIndex = stepsConfig.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      const prevStep = stepsConfig[currentIndex - 1];
      setCurrentStep(prevStep.id);
      setFormErrors({});
    }
  }, [currentStep, stepsConfig, setCurrentStep, setFormErrors]);

  const handleStepClick = useCallback((stepId: FormStep) => {
    if (canProceedToNextStep(stepId)) {
      setCurrentStep(stepId);
      setFormErrors({});
    }
  }, [canProceedToNextStep, setCurrentStep, setFormErrors]);

  const renderStepContent = useCallback(() => {
    const stepProps = {
      formData,
      onChange: handleFormChange,
      errors: formErrors,
      isLoading: loading,
      sessionToken
    };

    switch (currentStep) {
      case 'vehicle':
        return <VehicleStep {...stepProps} />;
      case 'customer':
        return <CustomerStep {...stepProps} />;
      case 'ppf':
        return <PPFStep {...stepProps} />;
      case 'schedule':
        return <ScheduleStep {...stepProps} />;
      default:
        return <VehicleStep {...stepProps} />;
    }
  }, [currentStep, formData, handleFormChange, formErrors, loading, sessionToken]);

  return {
    renderStepContent,
    handleNextStep,
    handlePreviousStep,
    handleStepClick
  };
};