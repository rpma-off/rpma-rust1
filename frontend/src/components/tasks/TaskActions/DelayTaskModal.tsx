import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TaskWithDetails } from '@/lib/backend';
import { useAuth } from '@/contexts/AuthContext';
import { ipcClient } from '@/lib/ipc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface DelayTaskModalProps {
  task: TaskWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DelayTaskModal: React.FC<DelayTaskModalProps> = ({ task, open, onOpenChange }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Form state
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');

  // Delay task mutation
  const delayTaskMutation = useMutation({
    mutationFn: async ({ newDate, reason }: { newDate: string; reason: string }) => {
      if (!user?.token) throw new Error('User not authenticated');
      return await ipcClient.tasks.delayTask(task.id, newDate, reason, user.token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('TÃ¢che reportÃ©e avec succÃ¨s');
      setNewDate('');
      setReason('');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Erreur lors du report de la tÃ¢che');
      console.error('Delay task error:', error);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newDate) {
      toast.error('Veuillez sÃ©lectionner une nouvelle date');
      return;
    }

    if (!reason.trim()) {
      toast.error('Veuillez indiquer la raison du report');
      return;
    }

    // Check if new date is in the future
    const selectedDate = new Date(newDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate <= today) {
      toast.error('La nouvelle date doit Ãªtre dans le futur');
      return;
    }

    delayTaskMutation.mutate({ newDate, reason: reason.trim() });
  };

  const handleCancel = () => {
    setNewDate('');
    setReason('');
    onOpenChange(false);
  };

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reporter la tÃ¢che</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>TÃ¢che actuelle: #{task.task_number} - {task.title}</p>
            {task.scheduled_date && (
              <p>Date actuelle: {new Date(task.scheduled_date).toLocaleDateString('fr-FR')}</p>
            )}
          </div>

          <div>
            <Label htmlFor="new-date">Nouvelle date *</Label>
            <Input
              id="new-date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={getMinDate()}
              required
              className="bg-muted border-border text-foreground"
            />
            <p className="text-xs text-border mt-1">
              La date doit Ãªtre dans le futur
            </p>
          </div>

          <div>
            <Label htmlFor="reason">Raison du report *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Expliquez pourquoi cette tÃ¢che doit Ãªtre reportÃ©e..."
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
              disabled={delayTaskMutation.isPending}
              className="border-border text-foreground hover:bg-border"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={delayTaskMutation.isPending || !newDate || !reason.trim()}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {delayTaskMutation.isPending ? 'Report...' : 'Reporter'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DelayTaskModal;
