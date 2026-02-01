// Workflow validation utilities

export interface WorkflowStep {
  id: string;
  name: string;
  completed: boolean;
  required: boolean;
}

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

export const validateWorkflowStep = (step: WorkflowStep): WorkflowValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (step.required && !step.completed) {
    errors.push(`Step "${step.name}" is required but not completed`);
  }

  if (!step.id) {
    errors.push('Step ID is required');
  }

  if (!step.name) {
    warnings.push('Step name is recommended');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

export const validateWorkflow = (steps: WorkflowStep[]): WorkflowValidationResult => {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  steps.forEach((step, index) => {
    const result = validateWorkflowStep(step);
    allErrors.push(...result.errors.map(error => `Step ${index + 1}: ${error}`));
    allWarnings.push(...result.warnings.map(warning => `Step ${index + 1}: ${warning}`));
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
};

export function runCompleteWorkflowValidation(workflow: any): WorkflowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  if (!workflow.id) {
    errors.push('Workflow ID is required');
  }

  if (!workflow.steps || workflow.steps.length === 0) {
    errors.push('Workflow must have at least one step');
  }

  // Add more validation logic as needed

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}