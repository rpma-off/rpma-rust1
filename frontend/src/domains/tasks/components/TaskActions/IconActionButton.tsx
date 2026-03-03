import React from 'react';
import { TaskActionButton, TaskActionItem } from './TaskActionButton';

interface IconActionButtonProps {
  action: TaskActionItem;
  onActionClick: (action: () => void) => void;
  compact?: boolean;
}

export function IconActionButton({ action, onActionClick, compact = false }: IconActionButtonProps) {
  return (
    <TaskActionButton action={action} onActionClick={onActionClick} layout="icon" compact={compact} />
  );
}
