'use client';

import React from 'react';
import { BaseErrorBoundary } from './BaseErrorBoundary';
import { FileX, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import type { JsonRecord, JsonValue as _JsonValue } from '@/types/utility.types';
import { normalizeError, tryToJsonValue } from '@/types/type-utils';

interface TaskErrorBoundaryProps {
  children: React.ReactNode;
  taskId?: string;
  fallback?: React.ComponentType<TaskErrorFallbackProps>;
  className?: string;
}

interface TaskErrorFallbackProps {
  error: Error;
  taskId?: string;
  onRetry: () => void;
  onGoBack: () => void;
}

// Default fallback component for task errors
const DefaultTaskErrorFallback: React.FC<TaskErrorFallbackProps> = ({
  error,
  taskId,
  onRetry,
  onGoBack
}) => {
  const getTaskSpecificMessage = (error: Error): { title: string; description: string } => {
    const message = error.message.toLowerCase();

    if (message.includes('task not found') || message.includes('404')) {
      return {
        title: 'Task Not Found',
        description: `The task ${taskId ? `#${taskId}` : ''} could not be found. It may have been deleted or you may not have access to it.`
      };
    }

    if (message.includes('unauthorized') || message.includes('403')) {
      return {
        title: 'Access Denied',
        description: 'You do not have permission to view this task. Please contact your administrator.'
      };
    }

    if (message.includes('network') || message.includes('fetch')) {
      return {
        title: 'Connection Problem',
        description: 'Unable to load task data. Please check your internet connection and try again.'
      };
    }

    if (message.includes('timeout')) {
      return {
        title: 'Request Timeout',
        description: 'The task is taking too long to load. This may be due to high server load.'
      };
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return {
        title: 'Data Validation Error',
        description: 'The task data appears to be corrupted or invalid. Please try refreshing the page.'
      };
    }

    return {
      title: 'Task Loading Error',
      description: 'An unexpected error occurred while loading the task. Please try again or contact support.'
    };
  };

  const { title, description } = getTaskSpecificMessage(error);

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
          <FileX className="h-8 w-8 text-red-600" />
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>

        <p className="text-gray-600 mb-6">
          {description}
        </p>

        {taskId && (
          <div className="bg-gray-50 rounded-md p-3 mb-6">
            <span className="text-sm text-gray-500">Task ID: </span>
            <span className="text-sm font-mono text-gray-900">{taskId}</span>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex gap-3 justify-center">
            <Button onClick={onRetry} className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4" />
              <span>Retry</span>
            </Button>

            <Button variant="outline" onClick={onGoBack} className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Go Back</span>
            </Button>
          </div>

          <div className="text-xs text-gray-500">
            <p>If this problem persists:</p>
            <ul className="list-disc list-inside mt-1 text-left">
              <li>Check if the task exists in the task list</li>
              <li>Verify your permissions with your administrator</li>
              <li>Contact support with the task ID above</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TaskErrorBoundary: React.FC<TaskErrorBoundaryProps> = ({
  children,
  taskId,
  fallback: CustomFallback,
  className
}) => {
  const router = useRouter();

  const handleTaskError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log task-specific error details
    console.error('Task Error Boundary caught error:', {
      taskId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });

    // Report to monitoring service with task context
    if (typeof window !== 'undefined') {
      try {
        // In a real app, send to your error monitoring service
        const errorReport: JsonRecord = {
          type: 'task_error',
          taskId: taskId || '',
          message: error.message,
          stack: tryToJsonValue(error.stack) ?? '',
          componentStack: errorInfo.componentStack ?? null,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        };

        console.warn('Task error reported:', errorReport);
        // TODO: Send to monitoring service
      } catch (reportingError: unknown) {
        console.error('Failed to report task error:', normalizeError(reportingError));
      }
    }
  };

  const handleRetry = () => {
    // Force a hard reload to clear any cached data
    window.location.reload();
  };

  const handleGoBack = () => {
    // Go back to task list or dashboard
    router.push('/dashboard');
  };

  // If custom fallback is provided, use BaseErrorBoundary with custom error handler
  if (CustomFallback) {
    return (
      <BaseErrorBoundary
        onError={handleTaskError}
        className={className}
        fallbackTitle="Task Error"
        fallbackDescription="An error occurred while loading the task"
        showRetry={true}
        showHome={true}
      >
        {children}
      </BaseErrorBoundary>
    );
  }

  // Use our task-specific error boundary with custom fallback
  return (
    <BaseErrorBoundary
      onError={(error, errorInfo) => {
        handleTaskError(error, errorInfo);
        // Don't render BaseErrorBoundary's fallback, we'll handle our own
        throw error;
      }}
      className={className}
    >
      <TaskErrorWrapper
        taskId={taskId}
        onRetry={handleRetry}
        onGoBack={handleGoBack}
      >
        {children}
      </TaskErrorWrapper>
    </BaseErrorBoundary>
  );
};

// Wrapper component to catch errors and show custom fallback
class TaskErrorWrapper extends React.Component<{
  children: React.ReactNode;
  taskId?: string;
  onRetry: () => void;
  onGoBack: () => void;
}, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode; taskId?: string; onRetry: () => void; onGoBack: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Task wrapper caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <DefaultTaskErrorFallback
          error={this.state.error}
          taskId={this.props.taskId}
          onRetry={this.props.onRetry}
          onGoBack={this.props.onGoBack}
        />
      );
    }

    return this.props.children;
  }
}

export default TaskErrorBoundary;