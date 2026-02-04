'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { designTokens } from '@/lib/design-tokens';
import { useCalendarStore } from '@/lib/stores/calendarStore';
import { useAuth } from '@/lib/auth/compatibility';
import { taskService } from '@/lib/services/entities/task.service';
import { format } from 'date-fns';

interface QuickAddDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickAddDialog({ isOpen, onClose }: QuickAddDialogProps) {
  const { user } = useAuth();
  const { selectedDate } = useCalendarStore();

  const [title, setTitle] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [technicianId, setTechnicianId] = useState('unassigned');
  const [interventionType, setInterventionType] = useState('PPF');
  const [date, setDate] = useState(() => selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await taskService.createTask({
        title,
        vehicle_plate: vehicle,
        vehicle_model: '',
        ppf_zones: interventionType === 'PPF' ? [] : [],
        external_id: null,
        status: 'pending',
        priority: 'medium',
        technician_id: technicianId === 'unassigned' ? '' : technicianId,
        template_id: interventionType === 'PPF' ? 'ppf-template' : null,
        scheduled_date: date,
        start_time: startTime,
        end_time: endTime,
        notes,
        client_id: null,
        customer_name: '',
        customer_phone: null,
        customer_email: null,
        estimated_duration: null,
        actual_duration: null,
        workflow_type: interventionType === 'PPF' ? 'ppf' : 'standard',
        workflow_data: null,
        intervention_number: null,
        before_photos: null,
        after_photos: null,
        checklist_items: null,
        checklist_completed_at: null,
        completed_at: null,
        cancelled_at: null,
        created_by: null,
        updated_by: null,
        synced: false,
        last_synced_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

      onClose();
      setTitle('');
      setVehicle('');
      setTechnicianId('unassigned');
      setInterventionType('PPF');
      setNotes('');
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nouvelle tâche</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Titre *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Installation PPF"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Véhicule *</label>
              <Input
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                placeholder="Ex: Tesla Model 3"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Technicien</label>
              <Select value={technicianId} onValueChange={setTechnicianId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Non assigné</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Date *</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Type</label>
              <Select value={interventionType} onValueChange={setInterventionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PPF">PPF</SelectItem>
                  <SelectItem value="Céramique">Céramique</SelectItem>
                  <SelectItem value="Detailing">Detailing</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Début</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Fin</label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes supplémentaires..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
              style={{ backgroundColor: designTokens.colors.primary }}
            >
              {isSubmitting ? 'Création...' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
