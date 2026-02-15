import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { ipcClient } from '@/lib/ipc';

interface InterventionStep {
  id: string;
  step_type: string;
  step_status: string;
  collected_data: Record<string, unknown>;
  photo_urls: string[] | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface InterventionData {
  id: string;
  task_id: string;
  workflow_type: string;
  status: string;
  current_step: number | null;
  progress_percentage: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  steps: InterventionStep[];
}

/**
 * Hook to fetch intervention data for a completed task
 */
export function useInterventionData(taskId: string) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['intervention-data', taskId],
    queryFn: async (): Promise<InterventionData | null> => {
      if (!session?.token || !taskId) return null;

      try {
        // First try to get active intervention
        let result = await ipcClient.interventions.getActiveByTask(taskId, session.token);

        let intervention = null;

        // Check if we got an active intervention
        if (result && typeof result === 'object' && 'type' in result) {
          const typedResult = result as { type: string; intervention?: Record<string, unknown> };

          if ((typedResult.type === 'ActiveRetrieved' || typedResult.type === 'ActiveByTask') && typedResult.intervention) {
            intervention = typedResult.intervention;
          }
        }

        // If no active intervention, try to get the latest (including completed)
        if (!intervention) {
          result = await ipcClient.interventions.getLatestByTask(taskId, session.token);

          if (result && typeof result === 'object' && 'intervention' in result) {
            const typedResult = result as { intervention?: Record<string, unknown> };
            if (typedResult.intervention) {
              intervention = typedResult.intervention;
            }
          }
        }

        if (!intervention) return null;

        const existingSteps = Array.isArray((intervention as { steps?: InterventionStep[] }).steps)
          ? (intervention as { steps?: InterventionStep[] }).steps
          : null;

        if (existingSteps) {
          return { ...intervention, steps: existingSteps } as InterventionData;
        }

        // Get steps data for this intervention
        const stepsResult = await ipcClient.interventions.getProgress(intervention.id as string, session.token);

        return {
          ...intervention,
          steps: (stepsResult?.steps || []) as unknown as InterventionStep[]
        } as InterventionData;
      } catch (error) {
        console.error('Failed to fetch intervention data:', error);
        return null;
      }
    },
    enabled: !!session?.token && !!taskId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get formatted workflow step data for display
 */
export function useWorkflowStepData(interventionData: InterventionData | null) {
  return {
    inspection: interventionData?.steps?.find(step => step.step_type === 'inspection'),
    preparation: interventionData?.steps?.find(step => step.step_type === 'preparation'),
    installation: interventionData?.steps?.find(step => step.step_type === 'installation'),
    finalization: interventionData?.steps?.find(step => step.step_type === 'finalization'),
  };
}
