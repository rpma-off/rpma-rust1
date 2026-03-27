import type { JsonValue } from "@/lib/backend";
import type { ServiceResponse } from "@/types/unified.types";
// CROSS-DOMAIN ADAPTER: task ↔ interventions
// ADR-003 violation: kept deliberately isolated here until an event-bus contract is designed.
// Rationale: violates ADR-003 (cross-domain communication must go through the event bus or
// shared contracts); prevents independent testing of each domain's service.
// Next step: expose the needed intervention lookup via a shared contract or an event (ADR-016)
// and remove this direct import.
// ❌ CROSS-DOMAIN IMPORT
import { interventionsIpc } from "@/domains/interventions";

/**
 * Task Step Service — Cross-domain adapter for step data operations.
 *
 * This service is the single authorised point where the tasks domain reaches
 * into the interventions domain to read/write step progress. Isolating the
 * violation here makes it explicit and easy to migrate once an event-bus
 * contract is available (see ADR-003 and ADR-016).
 */
export class TaskStepService {
  private static instance: TaskStepService;

  static getInstance(): TaskStepService {
    if (!TaskStepService.instance) {
      TaskStepService.instance = new TaskStepService();
    }
    return TaskStepService.instance;
  }

  private normalizeStepData(data: unknown): Record<string, unknown> {
    return typeof data === "object" && data !== null
      ? { ...(data as Record<string, unknown>) }
      : {};
  }

  private toJsonValue(value: unknown): JsonValue {
    return value as JsonValue;
  }

  /**
   * Updates step data for a task (delegates to intervention workflow service)
   * @param taskId - The task ID
   * @param stepId - The step ID
   * @param data - The step data to update
   * @param _userId - Optional user ID (unused, kept for API compatibility)
   * @param _updatedAt - Optional update timestamp (unused, kept for API compatibility)
   * @returns Promise resolving to service response
   */
  async updateTaskStepData(
    taskId: string,
    stepId: string,
    data: unknown,
    _userId?: string,
    _updatedAt?: string,
  ): Promise<ServiceResponse<unknown>> {
    try {
      // First, get the active intervention for this task
      const interventionResponse =
        await interventionsIpc.getActiveByTask(taskId);
      let interventionId: string | null = null;

      if (interventionResponse && typeof interventionResponse === "object") {
        if ("intervention" in interventionResponse) {
          const intervention = (
            interventionResponse as { intervention?: { id?: string } }
          ).intervention;
          interventionId = intervention?.id ?? null;
        } else if (
          "interventions" in interventionResponse &&
          Array.isArray(
            (interventionResponse as { interventions?: unknown }).interventions,
          )
        ) {
          const interventions = (
            interventionResponse as { interventions: Array<{ id?: string }> }
          ).interventions;
          interventionId = interventions[0]?.id ?? null;
        } else if ("type" in interventionResponse) {
          const typedResponse = interventionResponse as {
            type?: string;
            intervention?: { id?: string };
            interventions?: Array<{ id?: string }>;
          };
          if (
            typedResponse.type === "ActiveRetrieved" &&
            typedResponse.intervention?.id
          ) {
            interventionId = typedResponse.intervention.id;
          } else if (
            typedResponse.type === "ActiveByTask" &&
            typedResponse.interventions?.length
          ) {
            interventionId = typedResponse.interventions[0]?.id ?? null;
          }
        }
      }

      if (!interventionId) {
        return {
          success: false,
          error: `No active intervention found for task ${taskId}. Please start the intervention first.`,
          status: 404,
        };
      }

      const normalizedData = this.normalizeStepData(data);

      // Prepare step progress data
      const stepProgressData: Record<string, unknown> = {
        intervention_id: interventionId,
        step_id: stepId,
        progress_data: normalizedData,
        notes:
          typeof normalizedData.notes === "string" ? normalizedData.notes : "",
        quality_score: normalizedData.quality_score ?? null,
        completion_percentage:
          typeof normalizedData.completion_percentage === "number"
            ? normalizedData.completion_percentage
            : 0,
        estimated_time_remaining:
          normalizedData.estimated_time_remaining ?? null,
        issues_encountered: Array.isArray(normalizedData.issues_encountered)
          ? normalizedData.issues_encountered
          : [],
        materials_used: Array.isArray(normalizedData.materials_used)
          ? normalizedData.materials_used
          : [],
        photos_taken: Array.isArray(normalizedData.photos_taken)
          ? normalizedData.photos_taken
          : [],
        location_data: normalizedData.location_data ?? null,
        weather_conditions: normalizedData.weather_conditions ?? null,
        equipment_used: Array.isArray(normalizedData.equipment_used)
          ? normalizedData.equipment_used
          : [],
        safety_checks_completed: Array.isArray(
          normalizedData.safety_checks_completed,
        )
          ? normalizedData.safety_checks_completed
          : [],
        customer_feedback: normalizedData.customer_feedback ?? null,
      };

      // Save step progress using intervention service
      const savedStep = await interventionsIpc.saveStepProgress({
        step_id: stepId,
        collected_data: this.toJsonValue(stepProgressData),
        notes:
          typeof stepProgressData.notes === "string"
            ? stepProgressData.notes
            : null,
        photos: null,
      });

      return {
        success: true,
        data: savedStep,
        status: 200,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message, status: 500 };
    }
  }

  /**
   * Retrieves step data for a task (delegates to intervention workflow service)
   * @param _taskId - The task ID (unused, kept for API compatibility)
   * @param stepId - The step ID
   * @param _userId - Optional user ID (unused, kept for API compatibility)
   * @returns Promise resolving to service response
   */
  async getTaskStepData(
    _taskId: string,
    stepId: string,
    _userId?: string,
  ): Promise<
    ServiceResponse<{
      stepData: unknown;
      lastUpdated: string | null;
      taskStatus: string | null;
    }>
  > {
    try {
      // Get step data directly using intervention service
      const stepData = await interventionsIpc.getStep(stepId);

      return {
        success: true,
        data: {
          stepData: stepData.collected_data || stepData.step_data || {},
          lastUpdated: stepData.updated_at ? String(stepData.updated_at) : null,
          taskStatus: stepData.step_status ?? null,
        },
        status: 200,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message, status: 500 };
    }
  }
}

export const taskStepService = TaskStepService.getInstance();
