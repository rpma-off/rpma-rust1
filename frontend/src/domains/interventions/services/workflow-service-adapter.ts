/**
 * Workflow Service Adapter
 *
 * Provides access to workflow operations without creating a direct domain
 * dependency on the tasks domain, avoiding circular dependencies
 * (interventions ↔ tasks).
 */

import { ipcClient } from '@/lib/ipc';
import { AuthSecureStorage } from '@/lib/secureStorage';
import type {
  WorkflowExecution,
  WorkflowExecutionStep,
  CreateWorkflowExecutionDTO,
  StartTimingDTO,
  SignatureDTO,
} from '@/types/workflow.types';
import type {
  AdvanceStepRequest,
  SaveStepProgressRequest,
  JsonValue,
} from '@/lib/backend';

async function getSessionToken(): Promise<string> {
  const session = await AuthSecureStorage.getSession();
  if (!session.token) throw new Error('No session token available');
  return session.token;
}

class WorkflowServiceAdapter {
  private static instance: WorkflowServiceAdapter;

  static getInstance(): WorkflowServiceAdapter {
    if (!WorkflowServiceAdapter.instance) {
      WorkflowServiceAdapter.instance = new WorkflowServiceAdapter();
    }
    return WorkflowServiceAdapter.instance;
  }

  async getWorkflowByTaskId(taskId: string): Promise<WorkflowExecution | null> {
    const sessionToken = await getSessionToken();
    const result = await ipcClient.interventions.getActiveByTask(taskId, sessionToken);
    if (!result) return null;
    return result as unknown as WorkflowExecution;
  }

  async getWorkflowSteps(workflowId: string): Promise<WorkflowExecutionStep[]> {
    const sessionToken = await getSessionToken();
    const result = await ipcClient.interventions.getProgress(workflowId, sessionToken);
    return ((result as unknown as { steps?: WorkflowExecutionStep[] })?.steps || []);
  }

  async startWorkflowExecution(dto: CreateWorkflowExecutionDTO): Promise<WorkflowExecution> {
    const sessionToken = await getSessionToken();
    const result = await ipcClient.interventions.start({
      task_id: dto.taskId,
      intervention_number: null,
      ppf_zones: [],
      custom_zones: null,
      film_type: '',
      film_brand: null,
      film_model: null,
      weather_condition: '',
      lighting_condition: '',
      work_location: '',
      temperature: null,
      humidity: null,
      technician_id: '',
      assistant_ids: null,
      scheduled_start: new Date().toISOString(),
      estimated_duration: 0,
      gps_coordinates: null,
      address: null,
      notes: null,
      customer_requirements: null,
      special_instructions: null,
    }, sessionToken);
    return result as unknown as WorkflowExecution;
  }

  async startStep(stepId: string, workflowId: string, userId: string): Promise<void> {
    const sessionToken = await getSessionToken();
    const stepData: AdvanceStepRequest = {
      intervention_id: workflowId,
      step_id: stepId,
      collected_data: { action: 'start', user_id: userId } as JsonValue,
      photos: null,
      notes: null,
      quality_check_passed: true,
      issues: null,
    };
    await ipcClient.interventions.advanceStep(stepData, sessionToken);
  }

  async completeStep(stepId: string, data: Record<string, unknown>): Promise<void> {
    const sessionToken = await getSessionToken();
    const interventionId = (data.workflowId || data.intervention_id || '') as string;
    const stepData: AdvanceStepRequest = {
      intervention_id: interventionId,
      step_id: stepId,
      collected_data: data as JsonValue,
      photos: (data.photos as string[] | null) || null,
      notes: (data.notes as string | null) || null,
      quality_check_passed: true,
      issues: null,
    };
    await ipcClient.interventions.advanceStep(stepData, sessionToken);
  }

  async skipStep(stepId: string, workflowId: string, userId: string, reason?: string): Promise<void> {
    const sessionToken = await getSessionToken();
    const stepData: AdvanceStepRequest = {
      intervention_id: workflowId,
      step_id: stepId,
      collected_data: { action: 'skip', user_id: userId, skip_reason: reason } as JsonValue,
      photos: null,
      notes: reason || null,
      quality_check_passed: true,
      issues: null,
    };
    await ipcClient.interventions.advanceStep(stepData, sessionToken);
  }

  async updateWorkflowExecution(workflowId: string, data: Record<string, unknown>): Promise<void> {
    const sessionToken = await getSessionToken();
    await ipcClient.interventions.updateWorkflow(workflowId, data as Record<string, JsonValue | undefined>, sessionToken);
  }

  async startStepTiming(_dto: StartTimingDTO): Promise<void> {
    // Timing is handled via step advancement
  }

  async pauseStepTiming(_stepId: string, _workflowId: string, _userId: string): Promise<void> {
    // Timing pause is handled via step data
  }

  async resumeStepTiming(_stepId: string, _workflowId: string, _userId: string): Promise<void> {
    // Timing resume is handled via step data
  }

  async updateStepData(stepId: string, _workflowId: string, data: Record<string, unknown>, _userId?: string): Promise<void> {
    const sessionToken = await getSessionToken();
    const stepData: SaveStepProgressRequest = {
      step_id: stepId,
      collected_data: data as JsonValue,
      notes: null,
      photos: null,
    };
    await ipcClient.interventions.saveStepProgress(stepData, sessionToken);
  }

  async addSignature(dto: SignatureDTO): Promise<void> {
    const sessionToken = await getSessionToken();
    const stepData: SaveStepProgressRequest = {
      step_id: dto.stepId || '',
      collected_data: {
        signature: dto.signature,
        signature_type: dto.signatureType,
      } as JsonValue,
      notes: null,
      photos: null,
    };
    await ipcClient.interventions.saveStepProgress(stepData, sessionToken);
  }

  async uploadStepPhotos(_stepId: string, workflowId: string, files: File[], _userId?: string): Promise<{ urls: string[] }> {
    const sessionToken = await getSessionToken();
    const urls: string[] = [];
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const result = await ipcClient.photos.upload(
        workflowId,
        {
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          bytes: new Uint8Array(buffer),
        },
        'during',
        sessionToken
      );
      const resultObj = result as unknown as Record<string, unknown>;
      if (resultObj && 'file_path' in resultObj) {
        urls.push(resultObj.file_path as string);
      }
    }
    return { urls };
  }
}

export function getWorkflowServiceInstance(): WorkflowServiceAdapter {
  return WorkflowServiceAdapter.getInstance();
}
