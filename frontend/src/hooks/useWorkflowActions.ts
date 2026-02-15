import { useCallback, useMemo } from 'react';
import { useWorkflow } from '@/contexts/WorkflowContext';
import { WorkflowExecutionStep } from '@/types/workflow.types';

// Utility function to convert WorkflowExecutionStep to display format
const convertToDisplayStep = (executionStep: WorkflowExecutionStep) => ({
  id: executionStep.id,
  title: `Step ${executionStep.stepOrder}`,
  description: executionStep.notes || 'No description available',
  order_index: executionStep.stepOrder,
  status: executionStep.status,
  started_at: executionStep.startedAt || undefined,
  completed_at: executionStep.completedAt || undefined,
});

export function useWorkflowActions() {
  const {
    steps,
    currentStep,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    progress,
    isStepComplete
  } = useWorkflow();

  // Helper functions for navigation
  const canGoToNextStep = useMemo(() => {
    if (!currentStep || steps.length === 0) return false;
    const currentIndex = steps.findIndex(s => s.id === currentStep.id);
    return currentIndex < steps.length - 1;
  }, [currentStep, steps]);

  const canGoToPreviousStep = useMemo(() => {
    if (!currentStep || steps.length === 0) return false;
    const currentIndex = steps.findIndex(s => s.id === currentStep.id);
    return currentIndex > 0;
  }, [currentStep, steps]);

  const isStepAccessible = useCallback((stepId: string) => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return false;
    
    // A step is accessible if it's completed or if it's the next step after a completed step
    if (step.status === 'completed') return true;
    
    const stepIndex = steps.findIndex(s => s.id === stepId);
    if (stepIndex === 0) return true; // First step is always accessible
    
    // Check if previous step is completed
    const previousStep = steps[stepIndex - 1];
    return previousStep && previousStep.status === 'completed';
  }, [steps]);

  // Convert execution steps to display steps
  const displaySteps = useMemo(() => steps.map(convertToDisplayStep), [steps]);

  // Get current step in display format
  const currentDisplayStep = useMemo(() => {
    if (!currentStep) return null;
    return convertToDisplayStep(currentStep);
  }, [currentStep]);

  // Get next step in display format
  const nextStep = useMemo(() => {
    if (!currentStep) return displaySteps[0] || null;
    const currentIndex = steps.findIndex(s => s.id === currentStep.id);
    if (currentIndex === -1 || currentIndex === steps.length - 1) return null;
    return displaySteps[currentIndex + 1] || null;
  }, [currentStep, steps, displaySteps]);

  // Get previous step in display format
  const previousStep = useMemo(() => {
    if (!currentStep) return null;
    const currentIndex = steps.findIndex(s => s.id === currentStep.id);
    if (currentIndex <= 0) return null;
    return displaySteps[currentIndex - 1] || null;
  }, [currentStep, steps, displaySteps]);

  // Navigation functions
  const goToNext = useCallback(() => {
    if (canGoToNextStep) {
      goToNextStep();
    }
  }, [canGoToNextStep, goToNextStep]);

  const goToPrevious = useCallback(() => {
    if (canGoToPreviousStep) {
      goToPreviousStep();
    }
  }, [canGoToPreviousStep, goToPreviousStep]);

  const goToSpecificStep = useCallback((step: { id: string }) => {
    const executionStep = steps.find(s => s.id === step.id);
    if (executionStep) {
      goToStep(executionStep.id);
    }
  }, [steps, goToStep]);

  return {
    // Display steps (for UI components)
    steps: displaySteps,
    currentStep: currentDisplayStep,
    nextStep,
    previousStep,
    
    // Execution steps (for business logic)
    executionSteps: steps,
    currentExecutionStep: currentStep,
    
    // Navigation
    goToNext,
    goToPrevious,
    goToStep: goToSpecificStep,
    
    // State checks
    canGoToNextStep,
    canGoToPreviousStep,
    isStepComplete,
    isStepAccessible,
    
    // Progress
    currentStepIndex: currentStep ? steps.findIndex(s => s.id === currentStep.id) : 0,
    totalSteps: steps.length,
    completedSteps: steps.filter(s => s.status === 'completed').length,
    progress,
  };
}
