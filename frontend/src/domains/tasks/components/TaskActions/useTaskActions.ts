import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { TaskStatus, TaskPriority } from '@/lib/backend';
import { TaskWithDetails } from '@/types/task.types';
import { toast } from 'sonner';
import { taskService } from '../../services';
import { useAuth } from '@/domains/auth';
import { safeInvoke } from '@/lib/ipc';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import { phone } from '@/lib/utils/phone';
import { createStatusUpdate, createPriorityUpdate, createNotesUpdate } from './task-updates';

export function useTaskActions(task: TaskWithDetails) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: TaskStatus) => {
      if (!user?.token) throw new Error('Utilisateur non authentifié');
      return await taskService.updateTask(task.id, createStatusUpdate(newStatus));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', task.id] });
      toast.success('Statut mis à jour avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour du statut');
      console.error('Status update error:', error);
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async (newPriority: TaskPriority) => {
      if (!user?.token) throw new Error('Utilisateur non authentifié');
      return await taskService.updateTask(task.id, createPriorityUpdate(newPriority));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', task.id] });
      toast.success('Priorité mise à jour avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour de la priorité');
      console.error('Priority update error:', error);
    },
  });

  const assignToMeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.token) throw new Error('Utilisateur non authentifié');
      return await taskService.assignTask(task.id, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', task.id] });
      toast.success('Tâche assignée avec succès');
    },
    onError: (error) => {
      toast.error("Erreur lors de l'assignation");
      console.error('Assignment error:', error);
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      if (!user?.token) throw new Error('Utilisateur non authentifié');
      return await taskService.updateTask(task.id, createNotesUpdate(notes));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', task.id] });
      toast.success('Notes mises à jour avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour des notes');
      console.error('Notes update error:', error);
    },
  });

  const startInterventionMutation = useMutation({
    mutationFn: async () => {
      if (!user?.token) throw new Error('Utilisateur non authentifié');

      const interventionData = {
        task_id: task.id,
        intervention_number: null,
        intervention_type: 'ppf',
        priority: task.priority || 'medium',
        ppf_zones: task.ppf_zones || [],
        custom_ppf_zones: task.custom_ppf_zones || null,
        film_type: 'standard',
        film_brand: null,
        film_model: null,
        temperature: null,
        humidity: null,
        lighting_condition: null,
        work_location: null,
        ppf_zones_config: task.ppf_zones || [],
        gps_start_location: null,
        gps_end_location: null,
        weather_condition: null,
        notes: null,
      };

      const result = await safeInvoke(IPC_COMMANDS.INTERVENTION_WORKFLOW, {
        action: { action: 'Start', data: interventionData },
        sessionToken: user.token
      });

      if (result === null || typeof result !== 'object') {
        throw new Error('Invalid response: expected object');
      }
      if ('type' in result) {
        const workflowResponse = result as { type: string; intervention: unknown; steps: unknown[] };
        if (workflowResponse.type === 'Started') {
          return { success: true, intervention: workflowResponse.intervention, steps: workflowResponse.steps };
        }
      }
      throw new Error('Invalid response format for intervention start');
    },
    onSuccess: (result) => {
      if (result.success && result.intervention) {
        queryClient.invalidateQueries({ queryKey: ['tasks', task.id] });
        queryClient.invalidateQueries({ queryKey: ['interventions'] });
        toast.success('Intervention démarrée avec succès');
        router.push(`/tasks/${task.id}/workflow/ppf/steps/preparation`);
      }
    },
    onError: (error) => {
      toast.error("Erreur lors du démarrage de l'intervention");
      console.error('Start intervention error:', error);
    },
  });

  const initiateCallMutation = useMutation({
    mutationFn: async () => {
      const phoneNumber = task.customer_phone;
      if (!phoneNumber) {
        toast.error('Aucun numéro de téléphone disponible pour ce client');
        return;
      }

      await phone.initiateCustomerCall(phoneNumber);
      toast.success(`Appel lancé vers ${phoneNumber}`);
    },
    onError: (error) => {
      console.error('Failed to initiate call:', error);
      toast.error("Erreur lors de l'appel client");
    },
  });

  return {
    updateStatus: updateStatusMutation.mutate,
    updatePriority: updatePriorityMutation.mutate,
    assignToMe: assignToMeMutation.mutate,
    updateNotes: updateNotesMutation.mutate,
    startIntervention: startInterventionMutation.mutate,
    initiateCall: initiateCallMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    isUpdatingPriority: updatePriorityMutation.isPending,
    isAssigning: assignToMeMutation.isPending,
    isUpdatingNotes: updateNotesMutation.isPending,
    isStartingIntervention: startInterventionMutation.isPending,
    isInitiatingCall: initiateCallMutation.isPending,
  };
}
