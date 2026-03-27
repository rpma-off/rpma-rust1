import { safeInvoke, invalidatePattern } from '@/lib/ipc/core';
import { signalMutation } from '@/lib/data-freshness';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import {
  validateIntervention,
  validateInterventionStep,
} from '@/lib/validation/backend-type-guards';
import type {
  Intervention,
  InterventionStep,
  StartInterventionRequest,
  AdvanceStepRequest,
  SaveStepProgressRequest,
  FinalizeInterventionRequest,
} from '@/lib/backend';
import type { JsonValue } from '@/types/json';

export type { Intervention, InterventionStep };

export const interventionsIpc = {
  start: async (data: StartInterventionRequest) => {
    const result = await safeInvoke<any>(IPC_COMMANDS.INTERVENTION_START, { request: data as unknown as JsonValue });
    invalidatePattern('intervention:');
    invalidatePattern('task:');
    signalMutation('interventions');
    signalMutation('tasks');
    // The service expects { intervention, steps } or similar
    if (result && result.intervention) {
        return result;
    }
    return { intervention: validateIntervention(result), steps: [] as InterventionStep[] };
  },

  get: async (id: string, correlationId?: string) => {
    const result = await safeInvoke<any>(IPC_COMMANDS.INTERVENTION_GET, { id, correlation_id: (correlationId ?? null) as JsonValue });
    if (result && result.intervention) {
        return validateIntervention(result.intervention);
    }
    return validateIntervention(result);
  },

  getActiveByTask: async (taskId: string, correlationId?: string) => {
    const result = await safeInvoke<any>(IPC_COMMANDS.INTERVENTION_GET_ACTIVE_BY_TASK, { taskId, correlation_id: (correlationId ?? null) as JsonValue });
    if (result && result.interventions) {
        return { intervention: result.interventions[0] || null };
    }
    if (Array.isArray(result)) {
        return { intervention: result[0] || null };
    }
    return { intervention: null };
  },

  getLatestByTask: async (taskId: string, correlationId?: string) => {
    const result = await safeInvoke<any>(IPC_COMMANDS.INTERVENTION_GET_LATEST_BY_TASK, { taskId, correlation_id: (correlationId ?? null) as JsonValue });
    if (result && result.interventions) {
        const item = result.interventions[0];
        return { intervention: item ? validateIntervention(item) : null };
    }
    return { intervention: result ? validateIntervention(result) : null };
  },

  advanceStep: async (stepData: AdvanceStepRequest, correlationId?: string) => {
    const result = await safeInvoke<any>(IPC_COMMANDS.INTERVENTION_ADVANCE_STEP, {
        interventionId: stepData.intervention_id,
        stepId: stepData.step_id,
        collectedData: stepData.collected_data,
        photos: stepData.photos,
        notes: stepData.notes,
        issues: stepData.issues,
        qualityCheckPassed: stepData.quality_check_passed,
        correlation_id: (correlationId ?? null) as JsonValue
    });
    invalidatePattern('intervention:');
    invalidatePattern('task:');
    signalMutation('interventions');
    signalMutation('tasks');
    return result;
  },

  getStep: async (stepId: string, correlationId?: string) => {
    const result = await safeInvoke<InterventionStep>(IPC_COMMANDS.INTERVENTION_GET_STEP, {
        stepId,
        correlation_id: (correlationId ?? null) as JsonValue
    });
    return validateInterventionStep(result);
  },

  getProgress: async (interventionId: string, correlationId?: string) => {
    const result = await safeInvoke<any>(IPC_COMMANDS.INTERVENTION_GET_PROGRESS, {
        interventionId,
        correlation_id: (correlationId ?? null) as JsonValue
    });
    if (result && result.progress) {
        return {
            steps: result.steps || [],
            progress_percentage: result.progress.completion_percentage || 0
        };
    }
    return result;
  },

  saveStepProgress: async (stepData: SaveStepProgressRequest, correlationId?: string) => {
    const result = await safeInvoke<InterventionStep>(IPC_COMMANDS.INTERVENTION_SAVE_STEP_PROGRESS, {
        data: stepData as unknown as JsonValue,
        correlation_id: (correlationId ?? null) as JsonValue
    });
    invalidatePattern('intervention:');
    signalMutation('interventions');
    return validateInterventionStep(result);
  },

  updateWorkflow: async (id: string, data: any, correlationId?: string) => {
    const result = await safeInvoke<any>(IPC_COMMANDS.INTERVENTION_UPDATE, { id, data: data as unknown as JsonValue, correlation_id: (correlationId ?? null) as JsonValue });
    invalidatePattern('intervention:');
    signalMutation('interventions');
    if (result && result.intervention) {
        return validateIntervention(result.intervention);
    }
    return validateIntervention(result);
  },

  finalize: async (data: FinalizeInterventionRequest) => {
    const result = await safeInvoke<any>(IPC_COMMANDS.INTERVENTION_FINALIZE, { request: data as unknown as JsonValue });
    invalidatePattern('intervention:');
    invalidatePattern('task:');
    signalMutation('interventions');
    signalMutation('tasks');
    return result;
  },

  list: async (filters: {
    status?: string;
    technician_id?: string;
    limit?: number;
    offset?: number
  }) => {
    const result = await safeInvoke<any>(IPC_COMMANDS.INTERVENTION_LIST, {
        request: {
            status: filters.status ?? null,
            technician_id: filters.technician_id ?? null,
            limit: filters.limit ?? null,
            offset: filters.offset ?? null,
            correlation_id: null
        } as unknown as JsonValue
    });
    if (result && result.interventions) {
        return {
            interventions: result.interventions,
            total: result.interventions.length
        };
    }
    return { interventions: [], total: 0 };
  }
};
