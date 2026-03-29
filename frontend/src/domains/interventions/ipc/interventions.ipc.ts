import { safeInvoke, invalidatePattern } from '@/lib/ipc/core';
import { signalMutation } from '@/lib/data-freshness';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import {
  validateIntervention,
  validateInterventionStep,
} from '@/lib/validation/backend-type-guards';
import type {
  AdvanceStepRequest,
  AdvanceStepResponse,
  FinalizeInterventionRequest,
  FinalizeInterventionResponse,
  Intervention,
  InterventionProgressResponse,
  InterventionStep,
  SaveStepProgressRequest,
  StartInterventionRequest,
  StartInterventionResponse,
  UpdateInterventionRequest,
} from '@/lib/backend';
import type { JsonValue } from '@/types/json';

export type { Intervention, InterventionStep };

type StartInterventionPayload =
  | StartInterventionResponse
  | {
      intervention: Intervention;
      steps?: InterventionStep[];
    }
  | Intervention;

type FinalizeInterventionPayload =
  | FinalizeInterventionResponse
  | {
      intervention: Intervention;
    };

type AdvanceStepPayload = AdvanceStepResponse | InterventionStep;

type InterventionWithOptionalProgress = {
  progress?: {
    completion_percentage?: number;
  };
  steps?: InterventionStep[];
};

const bumpInterventionCaches = (includeTasks = false): void => {
  invalidatePattern('intervention:');
  signalMutation('interventions');

  if (includeTasks) {
    invalidatePattern('task:');
    signalMutation('tasks');
  }
};

const normalizeStartResponse = (
  result: StartInterventionPayload,
): StartInterventionResponse => {
  if (result && typeof result === 'object' && 'initial_requirements' in result) {
    return {
      ...result,
      intervention: validateIntervention(result.intervention),
      steps: result.steps.map(validateInterventionStep),
    };
  }

  if (result && typeof result === 'object' && 'intervention' in result) {
    return {
      intervention: validateIntervention(result.intervention),
      steps: (result.steps ?? []).map(validateInterventionStep),
      initial_requirements: [],
    };
  }

  return {
    intervention: validateIntervention(result),
    steps: [],
    initial_requirements: [],
  };
};

const normalizeFinalizeResponse = (
  result: FinalizeInterventionPayload,
): FinalizeInterventionResponse => {
  if (result && typeof result === 'object' && 'metrics' in result) {
    return {
      ...result,
      intervention: validateIntervention(result.intervention),
    };
  }

  return {
    intervention: validateIntervention(result.intervention),
    metrics: {
      total_duration_minutes: 0,
      completion_rate: 0,
      quality_score: null,
      customer_satisfaction: null,
      steps_completed: 0,
      total_steps: 0,
      photos_taken: 0,
    },
  };
};

export const interventionsIpc = {
  start: async (data: StartInterventionRequest): Promise<StartInterventionResponse> => {
    const result = await safeInvoke<StartInterventionPayload>(
      IPC_COMMANDS.INTERVENTION_START,
      { request: data as unknown as JsonValue },
    );
    bumpInterventionCaches(true);
    return normalizeStartResponse(result);
  },

  get: async (id: string, correlationId?: string): Promise<Intervention> => {
    const result = await safeInvoke<Intervention | { intervention: Intervention }>(
      IPC_COMMANDS.INTERVENTION_GET,
      { id, correlation_id: (correlationId ?? null) as JsonValue },
    );
    if (result && typeof result === 'object' && 'intervention' in result) {
      return validateIntervention(result.intervention);
    }
    return validateIntervention(result);
  },

  getActiveByTask: async (
    taskId: string,
    correlationId?: string,
  ): Promise<{ intervention: Intervention | null }> => {
    const result = await safeInvoke<
      { interventions?: Intervention[] } | Intervention[]
    >(IPC_COMMANDS.INTERVENTION_GET_ACTIVE_BY_TASK, {
      taskId,
      correlation_id: (correlationId ?? null) as JsonValue,
    });
    if (result && typeof result === 'object' && 'interventions' in result) {
      const intervention = result.interventions?.[0];
      return { intervention: intervention ? validateIntervention(intervention) : null };
    }
    if (Array.isArray(result)) {
      const intervention = result[0];
      return { intervention: intervention ? validateIntervention(intervention) : null };
    }
    return { intervention: null };
  },

  getLatestByTask: async (
    taskId: string,
    correlationId?: string,
  ): Promise<{ intervention: Intervention | null }> => {
    const result = await safeInvoke<
      { interventions?: Intervention[] } | Intervention | null
    >(IPC_COMMANDS.INTERVENTION_GET_LATEST_BY_TASK, {
      taskId,
      correlation_id: (correlationId ?? null) as JsonValue,
    });
    if (result && typeof result === 'object' && 'interventions' in result) {
      const intervention = result.interventions?.[0];
      return { intervention: intervention ? validateIntervention(intervention) : null };
    }
    return { intervention: result ? validateIntervention(result) : null };
  },

  advanceStep: async (
    stepData: AdvanceStepRequest,
    correlationId?: string,
  ): Promise<AdvanceStepResponse> => {
    const result = await safeInvoke<AdvanceStepPayload>(
      IPC_COMMANDS.INTERVENTION_ADVANCE_STEP,
      {
        interventionId: stepData.intervention_id,
        stepId: stepData.step_id,
        collectedData: stepData.collected_data,
        photos: stepData.photos,
        notes: stepData.notes,
        issues: stepData.issues,
        qualityCheckPassed: stepData.quality_check_passed,
        correlation_id: (correlationId ?? null) as JsonValue,
      },
    );
    bumpInterventionCaches(true);
    if (result && typeof result === 'object' && 'step' in result) {
      return {
        ...result,
        step: validateInterventionStep(result.step),
        next_step: result.next_step ? validateInterventionStep(result.next_step) : null,
      };
    }
    return {
      step: validateInterventionStep(result),
      next_step: null,
      progress_percentage: 0,
      requirements_completed: [],
    };
  },

  getStep: async (stepId: string, correlationId?: string): Promise<InterventionStep> => {
    const result = await safeInvoke<InterventionStep>(IPC_COMMANDS.INTERVENTION_GET_STEP, {
      stepId,
      correlation_id: (correlationId ?? null) as JsonValue,
    });
    return validateInterventionStep(result);
  },

  getProgress: async (
    interventionId: string,
    correlationId?: string,
  ): Promise<{ steps: InterventionStep[]; progress_percentage: number }> => {
    const result = await safeInvoke<
      InterventionProgressResponse | InterventionWithOptionalProgress
    >(IPC_COMMANDS.INTERVENTION_GET_PROGRESS, {
      interventionId,
      correlation_id: (correlationId ?? null) as JsonValue,
    });
    if (result && typeof result === 'object' && 'type' in result) {
      if (result.type === 'Retrieved') {
        return {
          steps: result.steps.map(validateInterventionStep),
          progress_percentage: result.progress.completion_percentage ?? 0,
        };
      }
      if (result.type === 'StepAdvanced') {
        return {
          steps: [validateInterventionStep(result.step)],
          progress_percentage: result.progress_percentage,
        };
      }
      return {
        steps: [validateInterventionStep(result.step)],
        progress_percentage: 0,
      };
    }

    return {
      steps: (result.steps ?? []).map(validateInterventionStep),
      progress_percentage: result.progress?.completion_percentage ?? 0,
    };
  },

  saveStepProgress: async (
    stepData: SaveStepProgressRequest,
    correlationId?: string,
  ): Promise<InterventionStep> => {
    const result = await safeInvoke<InterventionStep>(
      IPC_COMMANDS.INTERVENTION_SAVE_STEP_PROGRESS,
      {
        data: stepData as unknown as JsonValue,
        correlation_id: (correlationId ?? null) as JsonValue,
      },
    );
    bumpInterventionCaches();
    return validateInterventionStep(result);
  },

  updateWorkflow: async (
    id: string,
    data: UpdateInterventionRequest | Record<string, JsonValue>,
    correlationId?: string,
  ): Promise<Intervention> => {
    const result = await safeInvoke<Intervention | { intervention: Intervention }>(
      IPC_COMMANDS.INTERVENTION_UPDATE,
      { id, data: data as unknown as JsonValue, correlation_id: (correlationId ?? null) as JsonValue },
    );
    bumpInterventionCaches();
    if (result && typeof result === 'object' && 'intervention' in result) {
      return validateIntervention(result.intervention);
    }
    return validateIntervention(result);
  },

  finalize: async (
    data: FinalizeInterventionRequest,
  ): Promise<FinalizeInterventionResponse> => {
    const result = await safeInvoke<FinalizeInterventionPayload>(
      IPC_COMMANDS.INTERVENTION_FINALIZE,
      { request: data as unknown as JsonValue },
    );
    bumpInterventionCaches(true);
    return normalizeFinalizeResponse(result);
  },

  list: async (filters: {
    status?: string;
    technician_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ interventions: Intervention[]; total: number }> => {
    const result = await safeInvoke<{ interventions?: Intervention[] }>(
      IPC_COMMANDS.INTERVENTION_LIST,
      {
        request: {
          status: filters.status ?? null,
          technician_id: filters.technician_id ?? null,
          limit: filters.limit ?? null,
          offset: filters.offset ?? null,
          correlation_id: null,
        } as unknown as JsonValue,
      },
    );
    const interventions = (result.interventions ?? []).map(validateIntervention);
    return {
      interventions,
      total: interventions.length,
    };
  },
};
