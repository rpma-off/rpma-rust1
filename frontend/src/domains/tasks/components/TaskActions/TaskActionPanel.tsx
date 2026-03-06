import { memo } from 'react';
import { TaskWithDetails } from '@/types/task.types';
import { ManagedTaskActionPanel } from './ManagedTaskActionPanel';
import { DelegatedTaskActionPanel } from './DelegatedTaskActionPanel';

interface BaseTaskActionPanelProps {
  task: TaskWithDetails;
  isAssignedToCurrentUser: boolean;
  isAvailable: boolean;
  canStartTask: boolean;
  compact?: boolean;
  mobileDocked?: boolean;
}

interface ManagedTaskActionPanelProps extends BaseTaskActionPanelProps {
  mode: 'managed';
  stickyOffsetClass?: string;
}

interface DelegatedTaskActionPanelProps extends BaseTaskActionPanelProps {
  mode: 'delegated';
  onPrimaryAction?: () => void;
  onSecondaryAction?: (actionId: string) => void;
  isPending?: boolean;
}

export type TaskActionPanelProps = ManagedTaskActionPanelProps | DelegatedTaskActionPanelProps;

export const TaskActionPanel = memo(function TaskActionPanel(props: TaskActionPanelProps) {
  if (props.mode === 'managed') {
    return <ManagedTaskActionPanel {...props} />;
  }
  return <DelegatedTaskActionPanel {...props} />;
});
