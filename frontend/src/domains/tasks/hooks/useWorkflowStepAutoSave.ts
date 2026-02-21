import { toast } from 'sonner';
import { useAutoSave } from '@/shared/hooks/useAutoSave';
import type { AutoSaveOptions } from '@/shared/hooks/useAutoSave';
import { taskService } from '../services/task.service';

// Hook spécialisé pour les étapes de workflow
export function useWorkflowStepAutoSave(
  stepData: Record<string, unknown>,
  taskId: string,
  stepId: string,
  options: Omit<AutoSaveOptions<Record<string, unknown>>, 'delay'> & { delay?: number } = {}
) {
  const saveStepData = async (data: Record<string, unknown>) => {
    const result = await taskService.updateTaskStepData(taskId, stepId, {
      ...data,
      updated_at: new Date().toISOString()
    });

    if (!result.success) {
      throw new Error(`Erreur sauvegarde étape: ${result.error ?? 'Erreur inconnue'}`);
    }
  };

  return useAutoSave(stepData, saveStepData, {
    delay: 30000, // 30s pour les étapes workflow
    onSave: (data) => {
      toast.success('Étape sauvegardée automatiquement', {
        duration: 2000,
        description: `${stepId} - ${new Date().toLocaleTimeString()}`
      });
      options.onSave?.(data);
    },
    onError: (error) => {
      console.error('Workflow step auto-save error:', error);
      options.onError?.(error);
    },
    ...options
  });
}
