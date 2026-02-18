import { useState, useEffect } from 'react';
import { workflowTemplatesService, WorkflowTemplate, WorkflowStepTemplate, SOPInstruction } from '@/domains/workflow/server';

export interface UseWorkflowTemplateReturn {
  template: WorkflowTemplate | null;
  steps: WorkflowStepTemplate[];
  currentStep: WorkflowStepTemplate | null;
  loading: boolean;
  error: string | null;
  validateStep: (stepId: string, stepData: Record<string, unknown>) => Promise<{ isValid: boolean; errors: string[] }>;
  getStepByIndex: (index: number) => WorkflowStepTemplate | null;
  getNextStep: (currentStepId: string) => WorkflowStepTemplate | null;
  getPreviousStep: (currentStepId: string) => WorkflowStepTemplate | null;
  getTotalDuration: () => number;
  getProgressPercentage: (completedStepIds: string[]) => number;
}

/**
 * Hook pour gÃ©rer les templates de workflow
 */
export function useWorkflowTemplate(
  taskType: string = 'ppf_installation', 
  currentStepId?: string
): UseWorkflowTemplateReturn {
  const [template, setTemplate] = useState<WorkflowTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const workflowTemplate = await workflowTemplatesService.getWorkflowTemplate(taskType);
        setTemplate(workflowTemplate);
        
      } catch (err) {
        console.error('Error loading workflow template:', err);
        setError(err instanceof Error ? err.message : 'Failed to load template');
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [taskType]);

  const steps = template?.steps || [];
  const currentStep = currentStepId
    ? steps.find((step: WorkflowStepTemplate) => step.id === currentStepId) || null
    : null;

  const validateStep = async (stepId: string, stepData: Record<string, unknown>) => {
    return workflowTemplatesService.validateStep(taskType, stepId, stepData);
  };

  const getStepByIndex = (index: number): WorkflowStepTemplate | null => {
    return steps[index] || null;
  };

  const getNextStep = (currentStepId: string): WorkflowStepTemplate | null => {
    const currentIndex = steps.findIndex((step: WorkflowStepTemplate) => step.id === currentStepId);
    if (currentIndex === -1 || currentIndex === steps.length - 1) {
      return null;
    }
    return steps[currentIndex + 1];
  };

  const getPreviousStep = (currentStepId: string): WorkflowStepTemplate | null => {
    const currentIndex = steps.findIndex((step: WorkflowStepTemplate) => step.id === currentStepId);
    if (currentIndex <= 0) {
      return null;
    }
    return steps[currentIndex - 1];
  };

  const getTotalDuration = (): number => {
    return steps.reduce((total: number, step: WorkflowStepTemplate) => total + step.estimatedDuration, 0);
  };

  const getProgressPercentage = (completedStepIds: string[]): number => {
    if (steps.length === 0) return 0;
    return Math.round((completedStepIds.length / steps.length) * 100);
  };

  return {
    template,
    steps,
    currentStep,
    loading,
    error,
    validateStep,
    getStepByIndex,
    getNextStep,
    getPreviousStep,
    getTotalDuration,
    getProgressPercentage
  };
}

/**
 * Hook spÃ©cialisÃ© pour une Ã©tape spÃ©cifique
 */
export function useWorkflowStep(
  taskType: string = 'ppf_installation',
  stepId: string
) {
  const {
    template,
    steps,
    loading,
    error,
    validateStep,
    getNextStep,
    getPreviousStep
  } = useWorkflowTemplate(taskType, stepId);

  const step = steps.find((s: WorkflowStepTemplate) => s.id === stepId) || null;
  const stepIndex = steps.findIndex((s: WorkflowStepTemplate) => s.id === stepId);
  const nextStep = getNextStep(stepId);
  const previousStep = getPreviousStep(stepId);

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;

  // Generate step configuration for WorkflowStepTemplate component
  const getStepConfig = () => {
    if (!step) return null;

    // Map icon types to actual icons
    const getIconComponent = (iconType?: string) => {
      switch (iconType) {
        case 'camera':
          return 'Camera';
        case 'tool':
          return 'Tool';
        case 'shield':
          return 'Shield';
        case 'signature':
          return 'Signature';
        case 'file':
          return 'FileText';
        default:
          return 'FileText';
      }
    };

    return {
      id: step.id,
      title: step.title,
      description: step.description,
      icon: getIconComponent(step.iconType), // Will need to be converted to actual React component
      estimatedDuration: step.estimatedDuration,
      isRequired: step.isRequired,
      requiresPhotos: step.requiresPhotos,
      requiresSignature: step.requiresSignature
    };
  };

  const getSopInstructions = () => {
    return (step?.sopInstructions || []).sort((a: SOPInstruction, b: SOPInstruction) => a.order - b.order);
  };

  const getChecklistItems = (type?: string) => {
    const items = step?.checklistItems || [];
    return type 
      ? items.filter(item => item.type === type)
      : items;
  };

  const validateCurrentStep = async (stepData: Record<string, unknown>) => {
    return validateStep(stepId, stepData);
  };

  return {
    template,
    step,
    stepIndex,
    nextStep,
    previousStep,
    isFirstStep,
    isLastStep,
    loading,
    error,
    getStepConfig,
    getSopInstructions,
    getChecklistItems,
    validateCurrentStep,
    totalSteps: steps.length
  };
}
