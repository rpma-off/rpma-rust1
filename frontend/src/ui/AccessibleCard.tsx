import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from './card';

/**
 * Accessible card component with proper keyboard navigation and ARIA support
 * Designed for mobile-first interactions with touch targets
 */

export interface AccessibleCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Makes the card interactive/clickable */
  interactive?: boolean;
  /** Callback for card interaction */
  onInteract?: () => void;
  /** ARIA label for screen readers */
  'aria-label'?: string;
  /** ARIA description for additional context */
  'aria-describedby'?: string;
  /** Visual state indicator */
  state?: 'default' | 'selected' | 'error' | 'warning' | 'success';
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

const AccessibleCard = React.memo(React.forwardRef<HTMLDivElement, AccessibleCardProps>(
  ({
    className,
    interactive = false,
    onInteract,
    state = 'default',
    loading = false,
    disabled = false,
    children,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    onClick,
    onKeyDown,
    ...props
  }, ref) => {
    // Handle keyboard interaction
    const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled || loading) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onInteract?.();
      }

      // Call original onKeyDown if provided
      onKeyDown?.(event);
    }, [onInteract, onKeyDown, disabled, loading]);

    // Handle click interaction
    const handleClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || loading) return;

      // Provide haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      onInteract?.();
      onClick?.(event);
    }, [onInteract, onClick, disabled, loading]);

    // State-based styling
    const stateStyles = {
      default: '',
      selected: 'ring-2 ring-primary ring-offset-2 bg-primary/5',
      error: 'ring-2 ring-destructive ring-offset-2 border-destructive/50',
      warning: 'ring-2 ring-yellow-500 ring-offset-2 border-yellow-500/50',
      success: 'ring-2 ring-green-500 ring-offset-2 border-green-500/50'
    };

    const cardClassName = cn(
      'transition-all duration-200',
      interactive && 'cursor-pointer hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      interactive && 'active:scale-[0.98]',
      stateStyles[state],
      loading && 'opacity-60 cursor-wait',
      disabled && 'opacity-50 cursor-not-allowed',
      className
    );

    const cardProps = interactive ? {
      role: 'button',
      tabIndex: disabled ? -1 : 0,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      'aria-disabled': disabled || loading,
      onClick: handleClick,
      onKeyDown: handleKeyDown
    } : {
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy
    };

    return (
      <Card
        ref={ref}
        className={cardClassName}
        {...cardProps}
        {...props}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          </div>
        )}
        {children}
      </Card>
    );
  }
));

AccessibleCard.displayName = 'AccessibleCard';

/**
 * Task card specifically designed for mobile interaction
 * Includes proper touch targets and accessibility features
 */
export interface TaskCardProps extends AccessibleCardProps {
  /** Task data for ARIA labels */
  task?: {
    id: string;
    title?: string;
    status?: string;
    vehicle_plate?: string;
    customer_name?: string;
  };
  /** Action buttons */
  actions?: React.ReactNode;
  /** Primary action (usually view/edit) */
  onPrimaryAction?: () => void;
}

const TaskCard = React.memo(React.forwardRef<HTMLDivElement, TaskCardProps>(
  ({ task, actions, onPrimaryAction, children, ...props }, ref) => {
    // Generate accessible label from task data
    const ariaLabel = React.useMemo(() => {
      if (!task) return 'Tâche';

      const parts: string[] = [];
      if (task.title) parts.push(`Tâche ${task.title}`);
      if (task.vehicle_plate) parts.push(`véhicule ${task.vehicle_plate}`);
      if (task.customer_name) parts.push(`client ${task.customer_name}`);
      if (task.status) parts.push(`statut ${task.status}`);

      return parts.join(', ');
    }, [task]);

    return (
      <AccessibleCard
        ref={ref}
        interactive={!!onPrimaryAction}
        onInteract={onPrimaryAction}
        aria-label={ariaLabel}
        state={task?.status === 'error' ? 'error' : 'default'}
        {...props}
      >
        <CardContent className="p-4">
          {children}

          {/* Actions with proper spacing for touch */}
          {actions && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
              {actions}
            </div>
          )}
        </CardContent>
      </AccessibleCard>
    );
  }
));

TaskCard.displayName = 'TaskCard';

/**
 * Workflow step card for PPF processes
 * Enhanced accessibility for step-by-step navigation
 */
export interface WorkflowStepCardProps extends AccessibleCardProps {
  /** Step information */
  step?: {
    id: string;
    step_name?: string;
    status?: string;
    step_number?: number;
  };
  /** Whether this step is the current step */
  isCurrent?: boolean;
  /** Whether this step can be selected */
  canSelect?: boolean;
  /** Step navigation callback */
  onStepSelect?: () => void;
}

const WorkflowStepCard = React.memo(React.forwardRef<HTMLDivElement, WorkflowStepCardProps>(
  ({
    step,
    isCurrent = false,
    canSelect = false,
    onStepSelect,
    children,
    ...props
  }, ref) => {
    // Generate accessible label for workflow steps
    const ariaLabel = React.useMemo(() => {
      if (!step) return 'Étape de workflow';

      const parts: string[] = [];
      if (step.step_number) parts.push(`Étape ${step.step_number}`);
      if (step.step_name) parts.push(step.step_name);
      if (step.status) parts.push(`statut ${step.status}`);
      if (isCurrent) parts.push('étape actuelle');
      if (!canSelect) parts.push('non accessible');

      return parts.join(', ');
    }, [step, isCurrent, canSelect]);

    const getState = () => {
      if (step?.status === 'error') return 'error';
      if (step?.status === 'completed') return 'success';
      if (isCurrent) return 'selected';
      return 'default';
    };

    return (
      <AccessibleCard
        ref={ref}
        interactive={canSelect}
        onInteract={canSelect ? onStepSelect : undefined}
        aria-label={ariaLabel}
        aria-current={isCurrent ? 'step' : undefined}
        state={getState()}
        disabled={!canSelect}
        role={canSelect ? 'tab' : undefined}
        aria-selected={isCurrent}
        {...props}
      >
        {children}
      </AccessibleCard>
    );
  }
));

WorkflowStepCard.displayName = 'WorkflowStepCard';

export { AccessibleCard, TaskCard, WorkflowStepCard };