'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TaskWithDetails } from '@/types/task.types';
import { useTaskActions } from './useTaskActions';

interface AssignmentDialogProps {
  task: TaskWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignmentDialog({ task, open, onOpenChange }: AssignmentDialogProps) {
  const actions = useTaskActions(task);

  const handleAssignToMe = () => {
    actions.assignToMe();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>S&apos;assigner cette tâche</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            Vous êtes sur le point de vous assigner cette tâche. Confirmez-vous ?
          </p>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg border border-border/50 bg-background/60 hover:bg-border/30 text-sm"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleAssignToMe}
              disabled={actions.isAssigning}
              className="px-4 py-2 rounded-lg bg-[hsl(var(--rpma-teal))] hover:bg-[hsl(var(--rpma-teal))]/90 text-background text-sm disabled:opacity-50"
            >
              {actions.isAssigning ? 'Assignation...' : 'Confirmer'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
