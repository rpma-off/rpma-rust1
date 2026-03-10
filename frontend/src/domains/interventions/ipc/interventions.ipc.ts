import { safeInvoke, invalidatePattern } from '@/lib/ipc/core';
import { signalMutation } from '@/lib/data-freshness';
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
import { logger } from '@/lib/logging';
import { LogDomain } from '@/lib/logging/types';

// Re-export so domain-internal files (services, reports) can import these
// backend types through this IPC layer instead of referencing @/lib/backend directly.
export type { Intervention, InterventionStep };

/** Assert result is a non-null object, or throw. */
function ensureObject(result: JsonValue, context: string): asserts result is JsonObject {
  if (result === null || typeof result !== 'object') {
    throw new Error(`Invalid response: expected object for ${context}`);
  }
}

export const interventionsIpc = {
  start: async (data: StartInterventionRequest, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_WORKFLOW, {
      action: { action: 'Start', data },
      sessionToken: sessionToken
    });

    ensureObject(result, 'intervention start');
    if ('type' in result) {
      const workflowResponse = result as unknown as { type: string; intervention: Intervention; steps: InterventionStep[] };
      if (workflowResponse.type === 'Started') {
        invalidatePattern('intervention:');
        signalMutation('interventions');
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

    ensureObject(result, 'intervention get');
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

    logger.warn(LogDomain.TASK, '[IPC] getActiveByTask unexpected structure');
    return { intervention: null };
  },

  getLatestByTask: async (taskId: string, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_GET_LATEST_BY_TASK, {
      taskId: taskId,
      sessionToken: sessionToken
    });

    // safeInvoke already unwraps ApiResponse.data — result IS the Intervention or null
    if (result && typeof result === 'object' && 'id' in result) {
      return { intervention: result as unknown as Intervention };
    }

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

    ensureObject(result, 'advance step');
    if ('type' in result) {
      const progressResponse = result as unknown as {
        type: string;
        step: InterventionStep;
        next_step: InterventionStep | null;
        progress_percentage: number
      };
      if (progressResponse.type === 'StepAdvanced') {
        invalidatePattern('intervention:');
        signalMutation('interventions');
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

    ensureObject(result, 'get step');
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

    ensureObject(result, 'get progress');
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
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_PROGRESS, {
      action: {
        action: 'SaveStepProgress',
        step_id: stepData.step_id,
        collected_data: stepData.collected_data,
        notes: stepData.notes,
        photos: stepData.photos,
      } as unknown as JsonObject,
      sessionToken: sessionToken
    });

    ensureObject(result, 'save step progress');
    if ('type' in result) {
      const progressResponse = result as unknown as { type: string; step: InterventionStep };
      if (progressResponse.type === 'StepProgressSaved') {
        invalidatePattern('intervention:');
        signalMutation('interventions');
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

    ensureObject(result, 'update workflow');
    if ('type' in result) {
      const workflowResponse = result as unknown as { type: string; intervention: Intervention };
      if (workflowResponse.type === 'Updated') {
        invalidatePattern('intervention:');
        signalMutation('interventions');
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

    ensureObject(result, 'finalize intervention');
    if ('type' in result) {
      const workflowResponse = result as unknown as {
        type: string;
        intervention: Intervention;
        metrics: InterventionMetrics
      };
      if (workflowResponse.type === 'Finalized') {
        invalidatePattern('intervention:');
        signalMutation('interventions');
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

    ensureObject(result, 'intervention list');
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
