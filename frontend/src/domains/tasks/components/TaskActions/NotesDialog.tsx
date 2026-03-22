'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TaskWithDetails } from '@/types/task.types';
import { useTaskActions } from './useTaskActions';

interface NotesDialogProps {
  task: TaskWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotesDialog({ task, open, onOpenChange }: NotesDialogProps) {
  const actions = useTaskActions(task);
  const [notes, setNotes] = useState(task.note || '');

  useEffect(() => {
    if (open) setNotes(task.note || '');
  }, [open, task.note]);

  const handleSave = () => {
    if (notes !== task.note) {
      actions.updateNotes(notes);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier les notes</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajoutez des notes sur cette tâche..."
              className="min-h-[150px]"
            />
          </div>
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
              onClick={handleSave}
              disabled={actions.isUpdatingNotes}
              className="px-4 py-2 rounded-lg bg-[hsl(var(--rpma-teal))] hover:bg-[hsl(var(--rpma-teal))]/90 text-background text-sm disabled:opacity-50"
            >
              {actions.isUpdatingNotes ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
