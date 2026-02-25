import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import {
  validateIntervention,
  validateInterventionStep,
  validateStartInterventionResponse
} from '@/lib/validation/backend-type-guards';
import type { JsonObject, JsonValue } from '@/types/json';
import type {
  Intervention,
  InterventionStep,
  InterventionProgress,
  InterventionMetrics,
  StartInterventionRequest,
  AdvanceStepRequest,
  SaveStepProgressRequest,
  FinalizeInterventionRequest
} from '@/lib/backend';

interface SaveStepProgressAction {
  intervention_id: unknown;
  step_id: unknown;
  progress_percentage: unknown;
  current_phase: unknown;
  notes: unknown;
  temporary_data: unknown;
}

export const interventionsIpc = {
  start: async (data: StartInterventionRequest, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_WORKFLOW, {
      action: { action: 'Start', data },
      sessionToken: sessionToken
    });

    if (result === null || typeof result !== 'object') {
      throw new Error('Invalid response: expected object');
    }
    if ('type' in result) {
      const workflowResponse = result as unknown as { type: string; intervention: Intervention; steps: InterventionStep[] };
      if (workflowResponse.type === 'Started') {
        return validateStartInterventionResponse(workflowResponse);
      }
    }
    throw new Error('Invalid response format for intervention start');
  },

  get: async (id: string, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_WORKFLOW, {
      action: { action: 'Get', id },
      sessionToken: sessionToken
    });

    if (result === null || typeof result !== 'object') {
      throw new Error('Invalid response: expected object');
    }
    if ('type' in result) {
      const workflowResponse = result as unknown as { type: string; intervention: Intervention };
      if (workflowResponse.type === 'Retrieved') {
        return validateIntervention(workflowResponse.intervention);
      }
    }
    throw new Error('Invalid response format for intervention get');
  },

  getActiveByTask: async (taskId: string, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_WORKFLOW, {
      action: { action: 'GetActiveByTask', task_id: taskId },
      sessionToken: sessionToken
    });

    if (result && typeof result === 'object' && 'type' in result) {
      const workflowResponse = result as unknown as { type: string; interventions: Intervention[] };
      if (workflowResponse.type === 'ActiveByTask') {
        return {
          intervention: workflowResponse.interventions?.[0] || null
        };
      }
    }

    console.warn('[IPC] getActiveByTask unexpected structure');
    return { intervention: null };
  },

  getLatestByTask: async (taskId: string, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_GET_LATEST_BY_TASK, {
      taskId: taskId,
      sessionToken: sessionToken
    });

    if (result && typeof result === 'object' && 'data' in result) {
      const apiResponse = result as unknown as { data: Intervention | null };
      return {
        intervention: apiResponse.data || null
      };
    }

    console.warn('[IPC] getLatestByTask unexpected structure');
    return { intervention: null };
  },

  advanceStep: async (stepData: AdvanceStepRequest, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_PROGRESS, {
      action: {
        action: 'AdvanceStep',
        intervention_id: stepData.intervention_id,
        step_id: stepData.step_id,
        collected_data: stepData.collected_data,
        notes: stepData.notes,
        photos: stepData.photos,
        quality_check_passed: stepData.quality_check_passed,
        issues: stepData.issues
      },
      sessionToken: sessionToken
    });

    if (result === null || typeof result !== 'object') {
      throw new Error('Invalid response: expected object');
    }
    if ('type' in result) {
      const progressResponse = result as unknown as {
        type: string;
        step: InterventionStep;
        next_step: InterventionStep | null;
        progress_percentage: number
      };
      if (progressResponse.type === 'StepAdvanced') {
        return progressResponse;
      }
    }
    throw new Error('Invalid response format for advance step');
  },

  getStep: async (stepId: string, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_PROGRESS, {
      action: { action: 'GetStep', step_id: stepId },
      sessionToken: sessionToken
    });

    if (result === null || typeof result !== 'object') {
      throw new Error('Invalid response: expected object');
    }
    if ('type' in result) {
      const progressResponse = result as unknown as { type: string; step: InterventionStep };
      if (progressResponse.type === 'StepRetrieved') {
        return validateInterventionStep(progressResponse.step);
      }
    }
    throw new Error('Invalid response format for get step');
  },

  getProgress: async (interventionId: string, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_PROGRESS, {
      action: { action: 'Get', intervention_id: interventionId },
      sessionToken: sessionToken
    });

    if (result === null || typeof result !== 'object') {
      throw new Error('Invalid response: expected object');
    }
    if ('type' in result) {
      const progressResponse = result as unknown as {
        type: string;
        progress: InterventionProgress;
        steps: InterventionStep[]
      };
      if (progressResponse.type === 'Retrieved') {
        const progress = progressResponse.progress;
        return {
          steps: progressResponse.steps || [],
          progress_percentage: progress.completion_percentage || 0
        };
      }
    }
    throw new Error('Invalid response format for get progress');
  },

  saveStepProgress: async (stepData: SaveStepProgressRequest, sessionToken: string) => {
    const data = stepData as unknown as SaveStepProgressAction;
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_PROGRESS, {
      action: {
        action: 'SaveStepProgress',
        intervention_id: data.intervention_id,
        step_id: data.step_id,
        progress_percentage: data.progress_percentage,
        current_phase: data.current_phase,
        notes: data.notes,
        temporary_data: data.temporary_data,
      } as unknown as JsonObject,
      sessionToken: sessionToken
    });

    if (result === null || typeof result !== 'object') {
      throw new Error('Invalid response: expected object');
    }
    if ('type' in result) {
      const progressResponse = result as unknown as { type: string; step: InterventionStep };
      if (progressResponse.type === 'StepProgressSaved') {
        return validateInterventionStep(progressResponse.step);
      }
    }
    throw new Error('Invalid response format for save step progress');
  },

  updateWorkflow: async (id: string, data: JsonObject, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_WORKFLOW, {
      action: { action: 'Update', id, data },
      sessionToken: sessionToken
    });

    if (result === null || typeof result !== 'object') {
      throw new Error('Invalid response: expected object');
    }
    if ('type' in result) {
      const workflowResponse = result as unknown as { type: string; intervention: Intervention };
      if (workflowResponse.type === 'Updated') {
        return validateIntervention(workflowResponse.intervention);
      }
    }
    throw new Error('Invalid response format for update workflow');
  },

  finalize: async (data: FinalizeInterventionRequest, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_WORKFLOW, {
      action: { action: 'Finalize', data },
      sessionToken: sessionToken
    });

    if (result === null || typeof result !== 'object') {
      throw new Error('Invalid response: expected object');
    }
    if ('type' in result) {
      const workflowResponse = result as unknown as {
        type: string;
        intervention: Intervention;
        metrics: InterventionMetrics
      };
      if (workflowResponse.type === 'Finalized') {
        return workflowResponse;
      }
    }
    throw new Error('Invalid response format for finalize intervention');
  },

  list: async (filters: {
    status?: string;
    technician_id?: string;
    limit?: number;
    offset?: number
  }, sessionToken: string) => {
    const query: Record<string, string | number> = {};
    if (filters.status) query.status = filters.status;
    if (filters.technician_id) query.technician_id = filters.technician_id;
    if (filters.limit !== undefined) query.limit = filters.limit;
    if (filters.offset !== undefined) query.page = Math.floor(filters.offset / (filters.limit || 50)) + 1;

    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_MANAGEMENT, {
      action: { action: 'List', query },
      session_token: sessionToken
    });

    if (result === null || typeof result !== 'object') {
      throw new Error('Invalid response: expected object');
    }
    if ('type' in result) {
      const managementResponse = result as unknown as { type: string; interventions: Intervention[]; total: number };
      if (managementResponse.type === 'List') {
        return {
          interventions: managementResponse.interventions,
          total: managementResponse.total
        };
      }
    }
    throw new Error('Invalid response format for intervention list');
  },
};
