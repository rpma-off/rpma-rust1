import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/domains/auth';
import { interventionsIpc } from '../ipc/interventions.ipc';

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
        const activeResult = await interventionsIpc.getActiveByTask(taskId, session.token);

        let intervention = null;

        // Check if we got an active intervention
        if (activeResult && typeof activeResult === 'object') {
          const directResult = activeResult as { intervention?: Record<string, unknown> };
          if (directResult.intervention) {
            intervention = directResult.intervention;
          } else if ('type' in activeResult) {
            const typedResult = activeResult as { type: string; intervention?: Record<string, unknown> };
            if (
              (typedResult.type === 'ActiveRetrieved' || typedResult.type === 'ActiveByTask') &&
              typedResult.intervention
            ) {
              intervention = typedResult.intervention;
            }
          }
        }

        // If no active intervention, try to get the latest (including completed)
        if (!intervention) {
          const latestResult = await interventionsIpc.getLatestByTask(taskId, session.token);

          if (latestResult && typeof latestResult === 'object' && 'intervention' in latestResult) {
            const typedResult = latestResult as { intervention?: Record<string, unknown> };
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
        const stepsResult = await interventionsIpc.getProgress(intervention.id as string, session.token);

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
