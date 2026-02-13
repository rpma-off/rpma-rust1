import React, { useState, useEffect } from 'react';
import type { JsonObject } from '@/types/json';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaskWithDetails, TaskPriority } from '@/lib/backend';
import { useAuth } from '@/contexts/AuthContext';
import { ipcClient } from '@/lib/ipc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface EditTaskModalProps {
  task: TaskWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ task, open, onOpenChange }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<TaskPriority>(task.priority || 'medium');
  const [scheduledDate, setScheduledDate] = useState(task.scheduled_date || '');
  const [rdvDate, setRdvDate] = useState(task.date_rdv || '');
  const [rdvTime, setRdvTime] = useState(task.heure_rdv || '');
  const [estimatedDuration, setEstimatedDuration] = useState(task.estimated_duration?.toString() || '');
  const [notes, setNotes] = useState(task.notes || '');

  // Reset form when task changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority || 'medium');
    setScheduledDate(task.scheduled_date || '');
    setRdvDate(task.date_rdv || '');
    setRdvTime(task.heure_rdv || '');
    setEstimatedDuration(task.estimated_duration?.toString() || '');
    setNotes(task.notes || '');
  }, [task]);

  // Edit task mutation
  const editTaskMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (!user?.token) throw new Error('User not authenticated');
      return await ipcClient.tasks.editTask(task.id, updates as JsonObject, user.token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tâche mise à jour avec succès');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour de la tâche');
      console.error('Edit task error:', error);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updates: Record<string, unknown> = {};

    // Only include fields that have changed
    if (title !== task.title) updates.title = title;
    if (description !== (task.description || '')) updates.description = description;
    if (priority !== (task.priority || 'medium')) updates.priority = priority;
    if (scheduledDate !== (task.scheduled_date || '')) updates.scheduled_date = scheduledDate || null;
    if (rdvDate !== (task.date_rdv || '')) updates.date_rdv = rdvDate || null;
    if (rdvTime !== (task.heure_rdv || '')) updates.heure_rdv = rdvTime || null;
    if (estimatedDuration !== (task.estimated_duration?.toString() || '')) {
      updates.estimated_duration = estimatedDuration ? parseInt(estimatedDuration) : null;
    }
    if (notes !== (task.notes || '')) updates.notes = notes;

    // Only submit if there are changes
    if (Object.keys(updates).length === 0) {
      toast('Aucune modification détectée');
      return;
    }

    editTaskMutation.mutate(updates);
  };

  const handleCancel = () => {
    // Reset form to original values
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority || 'medium');
    setScheduledDate(task.scheduled_date || '');
    setRdvDate(task.date_rdv || '');
    setRdvTime(task.heure_rdv || '');
    setEstimatedDuration(task.estimated_duration?.toString() || '');
    setNotes(task.notes || '');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la tâche</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Informations générales</h3>

            <div>
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre de la tâche"
                required
                className="bg-muted border-border text-foreground"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description détaillée de la tâche"
                rows={3}
                className="bg-muted border-border text-foreground"
              />
            </div>

            <div>
              <Label htmlFor="priority">Priorité</Label>
              <Select value={priority} onValueChange={(value: TaskPriority) => setPriority(value)}>
                <SelectTrigger className="bg-muted border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-muted border-border">
                  <SelectItem value="low" className="text-foreground hover:bg-border">Basse</SelectItem>
                  <SelectItem value="medium" className="text-foreground hover:bg-border">Moyenne</SelectItem>
                  <SelectItem value="high" className="text-foreground hover:bg-border">Haute</SelectItem>
                  <SelectItem value="urgent" className="text-foreground hover:bg-border">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Scheduling */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Planification</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduled-date">Date planifiée</Label>
                <Input
                  id="scheduled-date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="bg-muted border-border text-foreground"
                />
              </div>

              <div>
                <Label htmlFor="estimated-duration">Durée estimée (minutes)</Label>
                <Input
                  id="estimated-duration"
                  type="number"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  placeholder="120"
                  min="0"
                  className="bg-muted border-border text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rdv-date">Date de RDV</Label>
                <Input
                  id="rdv-date"
                  type="date"
                  value={rdvDate}
                  onChange={(e) => setRdvDate(e.target.value)}
                  className="bg-muted border-border text-foreground"
                />
              </div>

              <div>
                <Label htmlFor="rdv-time">Heure de RDV</Label>
                <Input
                  id="rdv-time"
                  type="time"
                  value={rdvTime}
                  onChange={(e) => setRdvTime(e.target.value)}
                  className="bg-muted border-border text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Notes</h3>

            <div>
              <Label htmlFor="notes">Notes internes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes internes pour cette tâche..."
                rows={4}
                className="bg-muted border-border text-foreground"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={editTaskMutation.isPending}
              className="border-border text-foreground hover:bg-border"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={editTaskMutation.isPending || !title.trim()}
              className="bg-[hsl(var(--rpma-teal))] hover:bg-[hsl(var(--rpma-teal))]/80 text-white"
            >
              {editTaskMutation.isPending ? 'Mise à jour...' : 'Mettre à jour'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTaskModal;
