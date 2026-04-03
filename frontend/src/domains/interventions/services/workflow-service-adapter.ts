/**
 * Workflow Service Adapter
 *
 * Provides access to workflow operations without creating a direct domain
 * dependency on the tasks domain, avoiding circular dependencies
 * (interventions ↔ tasks).
 */

import { ipcClient } from "@/lib/ipc";
import type {
  AdvanceStepRequest,
  SaveStepProgressRequest,
  JsonValue,
} from "@/lib/backend";
import type {
  WorkflowExecution,
  WorkflowExecutionStep,
  CreateWorkflowExecutionDTO,
  StartTimingDTO,
  SignatureDTO,
} from "@/types/workflow.types";

export class WorkflowServiceAdapter {
  private static instance: WorkflowServiceAdapter;

  static getInstance(): WorkflowServiceAdapter {
    if (!WorkflowServiceAdapter.instance) {
      WorkflowServiceAdapter.instance = new WorkflowServiceAdapter();
    }
    return WorkflowServiceAdapter.instance;
  }

  async getWorkflowByTaskId(taskId: string): Promise<WorkflowExecution | null> {
    const result = await ipcClient.interventions.getActiveByTask(taskId);
    if (!result) return null;
    return result as unknown as WorkflowExecution;
  }

  async getWorkflowSteps(workflowId: string): Promise<WorkflowExecutionStep[]> {
    const result = await ipcClient.interventions.getProgress(workflowId);
    return (
      (result as unknown as { steps?: WorkflowExecutionStep[] })?.steps || []
    );
  }

  async startWorkflowExecution(
    dto: CreateWorkflowExecutionDTO,
  ): Promise<WorkflowExecution> {
    const result = await ipcClient.interventions.start({
      task_id: dto.taskId,
      intervention_number: null,
      ppf_zones: [],
      custom_zones: null,
      film_type: "",
      film_brand: null,
      film_model: null,
      weather_condition: "",
      lighting_condition: "",
      work_location: "",
      temperature: null,
      humidity: null,
      technician_id: "",
      assistant_ids: null,
      scheduled_start: Date.now(),
      estimated_duration: 0,
      gps_coordinates: null,
      address: null,
      notes: null,
      customer_requirements: null,
      special_instructions: null,
    });
    return result as unknown as WorkflowExecution;
  }

  async startStep(
    stepId: string,
    workflowId: string,
    userId: string,
  ): Promise<void> {
    const stepData: AdvanceStepRequest = {
      intervention_id: workflowId,
      step_id: stepId,
      collected_data: { action: "start", user_id: userId } as JsonValue,
      photos: null,
      notes: null,
      quality_check_passed: true,
      issues: null,
    };
    await ipcClient.interventions.advanceStep(stepData);
  }

  async completeStep(
    stepId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const interventionId = (data.workflowId ||
      data.intervention_id ||
      "") as string;
    const stepData: AdvanceStepRequest = {
      intervention_id: interventionId,
      step_id: stepId,
      collected_data: data as JsonValue,
      photos: (data.photos as string[] | null) || null,
      notes: (data.notes as string | null) || null,
      quality_check_passed: true,
      issues: null,
    };
    await ipcClient.interventions.advanceStep(stepData);
  }

  async skipStep(
    stepId: string,
    workflowId: string,
    userId: string,
    reason?: string,
  ): Promise<void> {
    const stepData: AdvanceStepRequest = {
      intervention_id: workflowId,
      step_id: stepId,
      collected_data: {
        action: "skip",
        user_id: userId,
        skip_reason: reason,
      } as JsonValue,
      photos: null,
      notes: reason || null,
      quality_check_passed: true,
      issues: null,
    };
    await ipcClient.interventions.advanceStep(stepData);
  }

  async updateWorkflowExecution(
    workflowId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const sanitizedData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    ) as Record<string, JsonValue>;
    await ipcClient.interventions.updateWorkflow(workflowId, sanitizedData);
  }

  async startStepTiming(_dto: StartTimingDTO): Promise<void> {
    // Timing is handled via step advancement
  }

  async pauseStepTiming(
    _stepId: string,
    _workflowId: string,
    _userId: string,
  ): Promise<void> {
    // Timing pause is handled via step data
  }

  async resumeStepTiming(
    _stepId: string,
    _workflowId: string,
    _userId: string,
  ): Promise<void> {
    // Timing resume is handled via step data
  }

  async updateStepData(
    stepId: string,
    _workflowId: string,
    data: Record<string, unknown>,
    _userId?: string,
  ): Promise<void> {
    const stepData: SaveStepProgressRequest = {
      step_id: stepId,
      collected_data: data as JsonValue,
      notes: null,
      photos: null,
    };
    await ipcClient.interventions.saveStepProgress(stepData);
  }

  async addSignature(dto: SignatureDTO): Promise<void> {
    const stepData: SaveStepProgressRequest = {
      step_id: dto.stepId || "",
      collected_data: {
        signature: dto.signature,
        signature_type: dto.signatureType,
      } as JsonValue,
      notes: null,
      photos: null,
    };
    await ipcClient.interventions.saveStepProgress(stepData);
  }

  async uploadStepPhotos(
    _stepId: string,
    workflowId: string,
    files: File[],
    _userId?: string,
  ): Promise<{ urls: string[] }> {
    const urls: string[] = [];
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const result = await ipcClient.photos.upload(
        workflowId,
        {
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          bytes: new Uint8Array(buffer),
        },
        "during",
      );
      const resultObj = result as unknown as Record<string, unknown>;
      if (resultObj && "file_path" in resultObj) {
        urls.push(resultObj.file_path as string);
      }
    }
    return { urls };
  }
}

export function getWorkflowServiceInstance(): WorkflowServiceAdapter {
  return WorkflowServiceAdapter.getInstance();
}

export const workflowServiceAdapter = WorkflowServiceAdapter.getInstance();
