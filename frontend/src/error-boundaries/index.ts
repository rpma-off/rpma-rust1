// Error Boundary Components
// Provides comprehensive error handling for different application contexts

export { BaseErrorBoundary } from './BaseErrorBoundary';
export { TaskErrorBoundary } from './TaskErrorBoundary';
export { WorkflowErrorBoundary } from './WorkflowErrorBoundary';
export { GlobalErrorBoundary } from './GlobalErrorBoundary';

// Re-export default components
export { default as TaskErrorBoundaryDefault } from './TaskErrorBoundary';
export { default as WorkflowErrorBoundaryDefault } from './WorkflowErrorBoundary';
export { default as GlobalErrorBoundaryDefault } from './GlobalErrorBoundary';

// Types for error boundary props
export interface ErrorBoundaryProps {
  children: React.ReactNode;
  className?: string;
}

export interface TaskErrorBoundaryProps extends ErrorBoundaryProps {
  taskId?: string;
  fallback?: React.ComponentType<TaskErrorFallbackProps>;
}

export interface WorkflowErrorBoundaryProps extends ErrorBoundaryProps {
  interventionId?: string;
  currentStep?: number;
  totalSteps?: number;
  onStepSkip?: () => void;
  onWorkflowReset?: () => void;
  onSaveProgress?: () => void;
}

export interface TaskErrorFallbackProps {
  error: Error;
  taskId?: string;
  onRetry: () => void;
  onGoBack: () => void;
}

export interface WorkflowErrorFallbackProps {
  error: Error;
  interventionId?: string;
  currentStep?: number;
  totalSteps?: number;
  onRetry: () => void;
  onStepSkip?: () => void;
  onWorkflowReset?: () => void;
  onSaveProgress?: () => void;
  onGoBack: () => void;
}