'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ipcClient } from '@/lib/ipc/client';
import { useAuth } from '@/shared/hooks/useAuth';

interface WorkflowStatusInfo {
  color: string;
  iconName: 'Clock' | 'Play' | 'Pause' | 'CheckCircle' | 'AlertCircle';
  label: string;
}

interface WorkflowButtonConfig {
  text: string;
  iconName: 'Play' | 'ArrowRight' | 'CheckCircle' | 'AlertCircle';
  variant: 'default' | 'outline' | 'secondary';
  action: 'start' | 'resume' | 'continue' | 'view' | 'disabled';
}

export function getStatusInfo(status?: string | null): WorkflowStatusInfo {
  switch (status) {
    case 'not_started':
      return { color: 'bg-gray-100 text-gray-800', iconName: 'Clock', label: 'Non démarré' };
    case 'in_progress':
      return { color: 'bg-blue-100 text-blue-800', iconName: 'Play', label: 'En cours' };
    case 'paused':
      return { color: 'bg-yellow-100 text-yellow-800', iconName: 'Pause', label: 'En pause' };
    case 'completed':
      return { color: 'bg-green-100 text-green-800', iconName: 'CheckCircle', label: 'Terminé' };
    case 'cancelled':
      return { color: 'bg-red-100 text-red-800', iconName: 'AlertCircle', label: 'Annulé' };
    default:
      return { color: 'bg-gray-100 text-gray-800', iconName: 'Clock', label: 'Inconnu' };
  }
}

export function getButtonConfig(status?: string | null): WorkflowButtonConfig {
  switch (status) {
    case 'not_started':
      return { text: 'Commencer le workflow', iconName: 'Play', variant: 'default', action: 'start' };
    case 'paused':
      return { text: 'Reprendre le workflow', iconName: 'Play', variant: 'default', action: 'resume' };
    case 'in_progress':
      return { text: 'Continuer le workflow', iconName: 'ArrowRight', variant: 'default', action: 'continue' };
    case 'completed':
      return { text: 'Voir le résumé', iconName: 'CheckCircle', variant: 'outline', action: 'view' };
    default:
      return { text: 'Workflow indisponible', iconName: 'AlertCircle', variant: 'secondary', action: 'disabled' };
  }
}

export function useWorkflowActions(taskId: string) {
  const { session } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWorkflowAction = useCallback(async (action: string) => {
    if (action === 'disabled') return;

    setIsLoading(true);
    setError(null);

    try {
      switch (action) {
        case 'start': {
          const interventionData = {
            task_id: taskId,
            intervention_number: null,
            ppf_zones: [],
            custom_zones: null,
            film_type: 'standard',
            film_brand: null,
            film_model: null,
            weather_condition: 'sunny',
            lighting_condition: 'natural',
            work_location: 'outdoor',
            temperature: null,
            humidity: null,
            technician_id: session?.id || '',
            assistant_ids: null,
            scheduled_start: Date.now(),
            estimated_duration: 120,
            gps_coordinates: null,
            address: null,
            notes: null,
            customer_requirements: null,
            special_instructions: null,
          };

          const result = await ipcClient.interventions.start(interventionData);

          if (result?.intervention) {
            toast.success('Workflow démarré avec succès');
            router.push(`/tasks/${taskId}/workflow/ppf`);
          } else {
            throw new Error('Échec du démarrage du workflow');
          }
          break;
        }

        case 'resume':
        case 'continue': {
          router.push(`/tasks/${taskId}/workflow/ppf`);
          break;
        }

        case 'view': {
          router.push(`/tasks/${taskId}/completed`);
          break;
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
      toast.error(`Erreur: ${errorMessage}`);
      console.error('Workflow action error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [session?.id, taskId, router]);

  return {
    isLoading,
    error,
    hasSession: !!session?.token,
    handleWorkflowAction,
  };
}
