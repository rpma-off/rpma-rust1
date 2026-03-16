import React, { useState } from 'react';
import { format, addDays } from 'date-fns';
import { TaskWithDetails } from '@/lib/backend';
import enhancedToast from '@/lib/enhanced-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/ui/submit-button';
import { useTaskMutations } from '../../hooks/useTaskMutations';

interface DelayTaskModalProps {
  task: TaskWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DelayTaskModal: React.FC<DelayTaskModalProps> = ({ task, open, onOpenChange }) => {
  const { delayTask } = useTaskMutations();

  // Form state
  const [newDate, setNewDate] = useState(
    task.scheduled_date || format(addDays(new Date(), 1), 'yyyy-MM-dd')
  );
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newDate) {
      enhancedToast.error('Veuillez sélectionner une nouvelle date');
      return;
    }

    if (!reason.trim()) {
      enhancedToast.error('Veuillez indiquer un motif pour le report');
      return;
    }

    try {
      await delayTask.mutateAsync({
        taskId: task.id,
        newDate,
        reason: reason.trim()
      });
      enhancedToast.success('Tâche reportée avec succès');
      onOpenChange(false);
    } catch (error) {
      enhancedToast.error('Erreur lors du report de la tâche');
      console.error('Delay task error:', error);
    }
  };

  const handleCancel = () => {
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reporter l&apos;intervention</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Tâche concernée: #{task.task_number} - {task.title}</p>
            <p>Date actuelle: {task.scheduled_date ? format(new Date(task.scheduled_date), 'dd/MM/yyyy') : 'Non définie'}</p>
          </div>

          <div>
            <Label htmlFor="new-date">Nouvelle date planifiée *</Label>
            <Input
              id="new-date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              required
              min={format(new Date(), 'yyyy-MM-dd')}
              className="bg-muted border-border text-foreground"
            />
          </div>

          <div>
            <Label htmlFor="reason">Motif du report *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Pièce manquante, client absent, problème technique..."
              rows={3}
              required
              className="bg-muted border-border text-foreground"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={delayTask.isPending}
              className="border-border text-foreground hover:bg-border"
            >
              Annuler
            </Button>
            <SubmitButton
              isPending={delayTask.isPending}
              pendingLabel="Report en cours..."
              disabled={!newDate || !reason.trim()}
              variant="default"
            >
              Confirmer le report
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DelayTaskModal;
