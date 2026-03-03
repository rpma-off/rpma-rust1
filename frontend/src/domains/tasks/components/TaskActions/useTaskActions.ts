import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { TaskPriority, TaskStatus } from '@/lib/backend';
import { TaskWithDetails } from '@/types/task.types';
import { toast } from 'sonner';
import { taskService } from '../../services';
import { useAuth } from '@/domains/auth';
import { InterventionWorkflowService } from '@/domains/interventions';
import { phone } from '@/lib/utils/phone';
import { createNotesUpdate, createPriorityUpdate, createStatusUpdate } from './task-updates';
import { interventionKeys, taskKeys } from '@/lib/query-keys';

export function useTaskActions(task: TaskWithDetails) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: TaskStatus) => {
      if (!user?.token) throw new Error('Utilisateur non authentifie');
      return await taskService.updateTask(task.id, createStatusUpdate(newStatus));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.byId(task.id) });
      toast.success('Statut mis a jour avec succes');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise a jour du statut');
      console.error('Status update error:', error);
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async (newPriority: TaskPriority) => {
      if (!user?.token) throw new Error('Utilisateur non authentifie');
      return await taskService.updateTask(task.id, createPriorityUpdate(newPriority));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.byId(task.id) });
      toast.success('Priorite mise a jour avec succes');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise a jour de la priorite');
      console.error('Priority update error:', error);
    },
  });

  const assignToMeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.token) throw new Error('Utilisateur non authentifie');
      return await taskService.assignTask(task.id, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.byId(task.id) });
      toast.success('Tache assignee avec succes');
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'assignation');
      console.error('Assignment error:', error);
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      if (!user?.token) throw new Error('Utilisateur non authentifie');
      return await taskService.updateTask(task.id, createNotesUpdate(notes));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.byId(task.id) });
      toast.success('Notes mises a jour avec succes');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise a jour des notes');
      console.error('Notes update error:', error);
    },
  });

  const startInterventionMutation = useMutation({
    mutationFn: async () => {
      if (!user?.token) throw new Error('Utilisateur non authentifie');

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

      const result = await InterventionWorkflowService.startIntervention(task.id, interventionData, user.token);

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Invalid response format for intervention start');
      }

      return result.data as { success: boolean; intervention: unknown; steps: unknown[] };
    },
    onSuccess: (result) => {
      if (result.success && result.intervention) {
        queryClient.invalidateQueries({ queryKey: taskKeys.byId(task.id) });
        queryClient.invalidateQueries({ queryKey: interventionKeys.all });
        toast.success('Intervention demarree avec succes');
        router.push(`/tasks/${task.id}/workflow/ppf/steps/preparation`);
      }
    },
    onError: (error) => {
      toast.error('Erreur lors du demarrage de l\'intervention');
      console.error('Start intervention error:', error);
    },
  });

  const initiateCallMutation = useMutation({
    mutationFn: async () => {
      const phoneNumber = task.customer_phone;
      if (!phoneNumber) {
        toast.error('Aucun numero de telephone disponible pour ce client');
        return;
      }

      await phone.initiateCustomerCall(phoneNumber);
      toast.success(`Appel lance vers ${phoneNumber}`);
    },
    onError: (error) => {
      console.error('Failed to initiate call:', error);
      toast.error('Erreur lors de l\'appel client');
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
