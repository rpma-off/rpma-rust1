import React from 'react';
import { MoreVertical } from 'lucide-react';
import { InlineActionButton } from './InlineActionButton';
import type { TaskActionItem } from './TaskActionButton';

interface MoreActionsSectionProps {
  showMoreActions: boolean;
  toggleMoreActions: () => void;
  actions: TaskActionItem[];
  onActionClick: (action: () => void) => void;
}

export function MoreActionsSection({
  showMoreActions,
  toggleMoreActions,
  actions,
  onActionClick,
}: MoreActionsSectionProps) {
  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={toggleMoreActions}
        className="w-full flex items-center justify-center p-3 rounded-lg border border-border/60 bg-background/40 hover:bg-border/30 transition-colors duration-200"
        aria-expanded={showMoreActions}
      >
        <MoreVertical className="h-4 w-4 mr-2 text-border-light" />
        <span className="text-sm font-medium text-border-light">Plus d&apos;actions</span>
        <MoreVertical className="h-4 w-4 ml-2 text-border-light" />
      </button>

      {showMoreActions && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {actions.map((action) => (
            <InlineActionButton key={action.id} action={action} onActionClick={onActionClick} />
          ))}
        </div>
      )}
    </div>
  );
}
