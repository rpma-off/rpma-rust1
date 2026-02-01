import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Task, UpdateTaskRequest } from '@/lib/backend';
import { ipcClient } from '@/lib/ipc';
import { useAuth } from '@/lib/auth/compatibility';

interface EditTaskDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: (updatedTask: Task) => void;
}

export function EditTaskDialog({ task, open, onOpenChange, onTaskUpdated }: EditTaskDialogProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    vin: '',
    date_rdv: '',
    heure_rdv: '',
    lot_film: '',
    notes: '',
    ppf_zones: [] as string[]
  });
  const [isLoading, setIsLoading] = useState(false);

  // Update form data when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        vin: task.vin || '',
        date_rdv: task.date_rdv || '',
        heure_rdv: task.heure_rdv || '',
        lot_film: task.lot_film || '',
        notes: task.notes || '',
        ppf_zones: task.ppf_zones || []
      });
    }
  }, [task]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !user?.token) return;

    // Create payload with all fields, using current values for unchanged fields
    const payload: UpdateTaskRequest = {
      id: task.id,
      title: task.title ?? null,
      description: task.description ?? null,
      priority: task.priority ?? null,
      status: task.status ?? null,
      vehicle_plate: formData.vin !== task.vin ? formData.vin : task.vehicle_plate ?? null,
      vehicle_model: task.vehicle_model ?? null,
      vehicle_year: task.vehicle_year ?? null,
      vehicle_make: task.vehicle_make ?? null,
      vin: formData.vin !== task.vin ? formData.vin : task.vin ?? null,
        ppf_zones: formData.ppf_zones !== (task.ppf_zones || []) ? formData.ppf_zones : (task.ppf_zones ?? null),
        custom_ppf_zones: task.custom_ppf_zones ?? null,
      client_id: task.client_id ?? null,
      customer_name: task.customer_name ?? null,
      customer_email: task.customer_email ?? null,
      customer_phone: task.customer_phone ?? null,
      customer_address: task.customer_address ?? null,
      external_id: task.external_id ?? null,
      lot_film: formData.lot_film !== task.lot_film ? formData.lot_film : task.lot_film ?? null,
      checklist_completed: task.checklist_completed ?? null,
      scheduled_date: task.scheduled_date ?? null,
      start_time: task.start_time ?? null,
      end_time: task.end_time ?? null,
      date_rdv: formData.date_rdv !== task.date_rdv ? formData.date_rdv : task.date_rdv ?? null,
      heure_rdv: formData.heure_rdv !== task.heure_rdv ? formData.heure_rdv : task.heure_rdv ?? null,
      template_id: task.template_id ?? null,
      workflow_id: task.workflow_id ?? null,
      estimated_duration: task.estimated_duration ?? null,
      notes: formData.notes !== task.notes ? formData.notes : task.notes ?? null,
      tags: task.tags ?? null,
      technician_id: task.technician_id ?? null,
    };

    // Check if anything actually changed
    const hasChanges = formData.vin !== (task.vin || '') ||
                      formData.date_rdv !== (task.date_rdv || '') ||
                      formData.heure_rdv !== (task.heure_rdv || '') ||
                      formData.lot_film !== (task.lot_film || '') ||
                      formData.notes !== (task.notes || '') ||
                      JSON.stringify(formData.ppf_zones) !== JSON.stringify(task.ppf_zones || []);

    // If nothing changed, close the dialog
    if (!hasChanges) {
      onOpenChange(false);
      return;
    }

    setIsLoading(true);
    try {
      const updatedTask = await ipcClient.tasks.update(task.id, payload, user.token);
      onTaskUpdated(updatedTask);
      toast.success('Tâche mise à jour avec succès');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Erreur lors de la mise à jour de la tâche');
    } finally {
      setIsLoading(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier la tâche</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vin">VIN</Label>
              <Input
                id="vin"
                name="vin"
                value={formData.vin}
                onChange={handleChange}
                placeholder="Numéro de série"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_rdv">Date de RDV</Label>
              <Input
                id="date_rdv"
                name="date_rdv"
                type="date"
                value={formData.date_rdv}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heure_rdv">Heure de RDV</Label>
              <Input
                id="heure_rdv"
                name="heure_rdv"
                type="time"
                value={formData.heure_rdv}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lot_film">N° de lot du film</Label>
              <Input
                id="lot_film"
                name="lot_film"
                value={formData.lot_film}
                onChange={handleChange}
                placeholder="N° de lot"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ppf_zones">Zone PPF</Label>
            <Input
              id="ppf_zones"
              name="ppf_zones"
              value={formData.ppf_zones.join(', ')}
              onChange={(e) => setFormData(prev => ({ ...prev, ppf_zones: e.target.value.split(',').map(s => s.trim()).filter(s => s) }))}
              placeholder="Zones PPF (séparées par des virgules)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Ajoutez des notes supplémentaires..."
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
