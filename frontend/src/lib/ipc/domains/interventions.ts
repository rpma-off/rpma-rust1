import { safeInvoke } from '../core';
import { IPC_COMMANDS } from '../commands';
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
} from '../types/index';

/**
 * Intervention workflow and progress management operations
 */
export const interventionOperations = {
  /**
   * Starts a new intervention workflow
   * @param data - Intervention start request data
   * @param sessionToken - User's session token
   * @returns Promise resolving to intervention start response
   */
  start: async (data: StartInterventionRequest, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_WORKFLOW, {
      action: { action: 'Start', data },
      sessionToken: sessionToken
    });

    // Extract Started response from InterventionWorkflowResponse
    if (result && typeof result === 'object' && 'type' in result) {
      const workflowResponse = result as unknown as { type: string; intervention: Intervention; steps: InterventionStep[] };
      if (workflowResponse.type === 'Started') {
        return validateStartInterventionResponse(workflowResponse);
      }
    }
    throw new Error('Invalid response format for intervention start');
  },

  /**
   * Gets an intervention by ID
   * @param id - Intervention ID
   * @param sessionToken - User's session token
   * @returns Promise resolving to intervention data
   */
  get: async (id: string, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_WORKFLOW, {
      action: { action: 'Get', id },
      sessionToken: sessionToken
    });

    // Extract intervention from Retrieved response
    if (result && typeof result === 'object' && 'type' in result) {
      const workflowResponse = result as unknown as { type: string; intervention: Intervention };
      if (workflowResponse.type === 'Retrieved') {
        return validateIntervention(workflowResponse.intervention);
      }
    }
    throw new Error('Invalid response format for intervention get');
  },

  /**
   * Gets the active intervention for a task
   * @param taskId - Task ID
   * @param sessionToken - User's session token
   * @returns Promise resolving to active intervention data
   */
  getActiveByTask: async (taskId: string, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_WORKFLOW, {
      action: { action: 'GetActiveByTask', task_id: taskId },
      sessionToken: sessionToken
    });

    // Handle InterventionWorkflowResponse directly
    // Expected: { type: "ActiveByTask", interventions: Intervention[] }
    if (result && typeof result === 'object' && 'type' in result) {
      const workflowResponse = result as unknown as { type: string; interventions: Intervention[] };
      if (workflowResponse.type === 'ActiveByTask') {
        return {
          intervention: workflowResponse.interventions?.[0] || null
        };
      }
    }

    // Fallback: return as-is if structure doesn't match
    console.warn('[IPC] getActiveByTask unexpected structure, returning as-is:', result);
    return result;
  },

  /**
   * Gets the latest intervention for a task
   * @param taskId - Task ID
   * @param sessionToken - User's session token
   * @returns Promise resolving to latest intervention data
   */
  getLatestByTask: async (taskId: string, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_GET_LATEST_BY_TASK, {
      taskId: taskId,
      sessionToken: sessionToken
    });

    // Handle the response - backend returns ApiResponse<Option<Intervention>>
    if (result && typeof result === 'object' && 'data' in result) {
      const apiResponse = result as unknown as { data: Intervention | null };
      return {
        intervention: apiResponse.data || null
      };
    }

    // Fallback: return as-is if structure doesn't match
    console.warn('[IPC] getLatestByTask unexpected structure, returning as-is:', result);
    return result;
  },

  /**
   * Advances to the next step in an intervention
   * @param stepData - Step advancement data
   * @param sessionToken - User's session token
   * @returns Promise resolving to step advancement response
   */
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

    // Return the full StepAdvanced response
    if (result && typeof result === 'object' && 'type' in result) {
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

  /**
   * Gets a specific intervention step by ID
   * @param stepId - Step ID
   * @param sessionToken - User's session token
   * @returns Promise resolving to step data
   */
  getStep: async (stepId: string, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_PROGRESS, {
      action: { action: 'GetStep', step_id: stepId },
      sessionToken: sessionToken
    });

    // Extract step from StepRetrieved response
    if (result && typeof result === 'object' && 'type' in result) {
      const progressResponse = result as unknown as { type: string; step: InterventionStep };
      if (progressResponse.type === 'StepRetrieved') {
        return validateInterventionStep(progressResponse.step);
      }
    }
    throw new Error('Invalid response format for get step');
  },

  /**
   * Gets intervention progress information
   * @param interventionId - Intervention ID
   * @param sessionToken - User's session token
   * @returns Promise resolving to progress data
   */
  getProgress: async (interventionId: string, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_PROGRESS, {
      action: { action: 'Get', intervention_id: interventionId },
      sessionToken: sessionToken
    });

    // Extract progress data from Retrieved response
    if (result && typeof result === 'object' && 'type' in result) {
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

  /**
   * Saves step progress for an intervention
   * @param stepData - Step progress data
   * @param sessionToken - User's session token
   * @returns Promise resolving to updated step
   */
  saveStepProgress: async (stepData: SaveStepProgressRequest, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_PROGRESS, {
      action: { action: 'SaveStepProgress', ...stepData },
      sessionToken: sessionToken
    });

    // Extract step from StepProgressSaved response
    if (result && typeof result === 'object' && 'type' in result) {
      const progressResponse = result as unknown as { type: string; step: InterventionStep };
      if (progressResponse.type === 'StepProgressSaved') {
        return validateInterventionStep(progressResponse.step);
      }
    }
    throw new Error('Invalid response format for save step progress');
  },

  /**
   * Updates an intervention workflow
   * @param id - Intervention ID
   * @param data - Update data
   * @param sessionToken - User's session token
   * @returns Promise resolving to updated intervention
   */
  updateWorkflow: async (id: string, data: JsonObject, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_WORKFLOW, {
      action: { action: 'Update', id, data },
      sessionToken: sessionToken
    });

    // Extract intervention from Updated response
    if (result && typeof result === 'object' && 'type' in result) {
      const workflowResponse = result as unknown as { type: string; intervention: Intervention };
      if (workflowResponse.type === 'Updated') {
        return validateIntervention(workflowResponse.intervention);
      }
    }
    throw new Error('Invalid response format for update workflow');
  },

  /**
   * Finalizes an intervention
   * @param data - Finalization data
   * @param sessionToken - User's session token
   * @returns Promise resolving to finalization response
   */
  finalize: async (data: FinalizeInterventionRequest, sessionToken: string) => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_WORKFLOW, {
      action: { action: 'Finalize', data },
      sessionToken: sessionToken
    });

    // Return the full Finalized response
    if (result && typeof result === 'object' && 'type' in result) {
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

  /**
   * Lists interventions with filters
   * @param filters - List filters
   * @param sessionToken - User's session token
   * @returns Promise resolving to intervention list
   */
  list: async (filters: {
    status?: string;
    technician_id?: string;
    limit?: number;
    offset?: number
  }, sessionToken: string) => {
    // Backend expects InterventionManagementAction with #[serde(tag = "action")]
    // So the action must be: { action: "List", query: { ... } }
    const query: Record<string, string | number> = {};
    if (filters.status) query.status = filters.status;
    if (filters.technician_id) query.technician_id = filters.technician_id;
    if (filters.limit !== undefined) query.limit = filters.limit;
    if (filters.offset !== undefined) query.page = Math.floor(filters.offset / (filters.limit || 50)) + 1;

    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.INTERVENTION_MANAGEMENT, {
      action: { action: 'List', query },
      session_token: sessionToken
    });

    // Extract interventions from List response
    if (result && typeof result === 'object' && 'type' in result) {
      const managementResponse = result as unknown as { type: string; interventions: Intervention[]; total: number; page: number; limit: number };
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
