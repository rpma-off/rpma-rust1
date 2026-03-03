import React from 'react';
import { IconActionButton } from './IconActionButton';
import type { TaskActionItem } from './TaskActionButton';

interface SecondaryActionsGridProps {
  actions: TaskActionItem[];
  onActionClick: (action: () => void) => void;
  columns?: 2 | 3;
}

export function SecondaryActionsGrid({ actions, onActionClick, columns = 2 }: SecondaryActionsGridProps) {
  return (
    <div
      className={`grid gap-3 ${columns === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}
    >
      {actions.map((action) => (
        <IconActionButton key={action.id} action={action} onActionClick={onActionClick} />
      ))}
    </div>
  );
}
