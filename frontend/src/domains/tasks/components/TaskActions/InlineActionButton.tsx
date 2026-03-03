import React from 'react';
import { TaskActionButton, TaskActionItem } from './TaskActionButton';

interface InlineActionButtonProps {
  action: TaskActionItem;
  onActionClick: (action: () => void) => void;
}

export function InlineActionButton({ action, onActionClick }: InlineActionButtonProps) {
  return <TaskActionButton action={action} onActionClick={onActionClick} layout="inline" />;
}
