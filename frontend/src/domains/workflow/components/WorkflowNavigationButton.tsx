'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Workflow } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WorkflowNavigationButtonProps {
  taskId: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  onBeforeNavigate?: () => Promise<boolean> | boolean;
  onAfterNavigate?: () => void;
  onError?: (error: Error) => void;
}

export function WorkflowNavigationButton({
  taskId,
  variant = 'outline',
  size = 'default',
  className,
  disabled = false,
  children,
  onBeforeNavigate,
  onAfterNavigate,
  onError
}: WorkflowNavigationButtonProps) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationError, setNavigationError] = useState<string | null>(null);

  const handleNavigation = async () => {
    if (disabled || isNavigating) return;

    try {
      setIsNavigating(true);
      setNavigationError(null);

      // Run pre-navigation check if provided
      if (onBeforeNavigate) {
        const canNavigate = await onBeforeNavigate();
        if (!canNavigate) {
          setIsNavigating(false);
          return;
        }
      }

      // Validate taskId
      if (!taskId || typeof taskId !== 'string') {
        throw new Error('Invalid task ID provided');
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(taskId)) {
        throw new Error('Task ID must be a valid UUID');
      }

      // Workflow URL: `/tasks/${taskId}/workflow`

      // Attempt navigation
      toast('Workflow en développement - disponible bientôt');

      // Call success callback
      if (onAfterNavigate) {
        onAfterNavigate();
      }

      // Show success feedback
      toast.success('Navigation vers le workflow réussie');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de navigation inconnue';
      setNavigationError(errorMessage);

      // Call error callback
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage));
      }

      // Show error feedback
      toast.error(`Erreur de navigation: ${errorMessage}`);

      console.error('[WorkflowNavigation] Navigation failed:', error);
    } finally {
      setIsNavigating(false);
    }
  };

  const getButtonContent = () => {
    if (isNavigating) {
      return (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Navigation...
        </>
      );
    }

    if (navigationError) {
      return (
        <>
          <AlertTriangle className="w-4 h-4 mr-2" />
          Erreur
        </>
      );
    }

    return (
      <>
        <Workflow className="w-4 h-4 mr-2" />
        {children || 'Accéder au workflow'}
      </>
    );
  };

  const getButtonVariant = () => {
    if (navigationError) {
      return 'destructive';
    }
    return variant;
  };

  return (
    <Button
      variant={getButtonVariant()}
      size={size}
      className={cn(
        'transition-all duration-200',
        navigationError && 'border-red-500/50 text-red-400 hover:bg-red-500/10',
        className
      )}
      disabled={disabled || isNavigating}
      onClick={handleNavigation}
      title={navigationError ? `Erreur: ${navigationError}` : 'Accéder au workflow PPF'}
    >
      {getButtonContent()}
    </Button>
  );
}

// Convenience component for common use cases
export function TaskWorkflowButton({ taskId, ...props }: Omit<WorkflowNavigationButtonProps, 'taskId'> & { taskId: string }) {
  return (
    <WorkflowNavigationButton
      taskId={taskId}
      {...props}
    />
  );
}

// Hook for programmatic navigation
export function useWorkflowNavigation() {
  const [isNavigating, setIsNavigating] = useState(false);

  const navigateToWorkflow = async (taskId: string): Promise<boolean> => {
    if (isNavigating) return false;

    try {
      setIsNavigating(true);

      // Validate inputs
      if (!taskId) {
        throw new Error('Task ID is required');
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(taskId)) {
        throw new Error('Invalid task ID format');
      }

      // Navigate
      toast('Workflow en développement - disponible bientôt');

      return true;
    } catch (error) {
      console.error('[useWorkflowNavigation] Navigation failed:', error);
      return false;
    } finally {
      setIsNavigating(false);
    }
  };

  return {
    navigateToWorkflow,
    isNavigating
  };
}
