/**
 * Workflow Service Adapter
 *
 * Provides access to WorkflowService without creating a direct domain
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
import type { JsonValue } from '@/types/json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

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
    const result = await ipcClient.interventions.getByTask(taskId, sessionToken);
    if (!result) return null;
    return result as unknown as WorkflowExecution;
  }

  async getWorkflowSteps(workflowId: string): Promise<WorkflowExecutionStep[]> {
    const sessionToken = await getSessionToken();
    const result = await ipcClient.interventions.getSteps(workflowId, sessionToken);
    return (result || []) as unknown as WorkflowExecutionStep[];
  }

  async startWorkflowExecution(dto: CreateWorkflowExecutionDTO): Promise<WorkflowExecution> {
    const sessionToken = await getSessionToken();
    const result = await ipcClient.interventions.start(
      dto.taskId,
      { task_id: dto.taskId } as AnyRecord,
      sessionToken
    );
    return result as unknown as WorkflowExecution;
  }

  async startStep(stepId: string, workflowId: string, userId: string): Promise<void> {
    const sessionToken = await getSessionToken();
    await ipcClient.interventions.advanceStep(workflowId, {
      step_id: stepId,
      user_id: userId,
    } as AnyRecord, sessionToken);
  }

  async completeStep(stepId: string, data: AnyRecord): Promise<void> {
    const sessionToken = await getSessionToken();
    const interventionId = data.workflowId || data.intervention_id;
    await ipcClient.interventions.advanceStep(interventionId, {
      step_id: stepId,
      ...data,
    } as AnyRecord, sessionToken);
  }

  async skipStep(stepId: string, workflowId: string, userId: string, reason: string): Promise<void> {
    const sessionToken = await getSessionToken();
    await ipcClient.interventions.advanceStep(workflowId, {
      step_id: stepId,
      user_id: userId,
      skip: true,
      skip_reason: reason,
    } as AnyRecord, sessionToken);
  }

  async updateWorkflowExecution(workflowId: string, data: AnyRecord): Promise<void> {
    const sessionToken = await getSessionToken();
    await ipcClient.interventions.advanceStep(workflowId, data as AnyRecord, sessionToken);
  }

  async startStepTiming(dto: StartTimingDTO): Promise<void> {
    // Timing is handled via step advancement
  }

  async pauseStepTiming(stepId: string, workflowId: string, userId: string): Promise<void> {
    // Timing pause is handled via step data
  }

  async resumeStepTiming(stepId: string, workflowId: string, userId: string): Promise<void> {
    // Timing resume is handled via step data
  }

  async updateStepData(stepId: string, workflowId: string, data: AnyRecord): Promise<void> {
    const sessionToken = await getSessionToken();
    await ipcClient.interventions.saveStepProgress(workflowId, {
      step_id: stepId,
      ...data,
    } as AnyRecord, sessionToken);
  }

  async addSignature(dto: SignatureDTO): Promise<void> {
    const sessionToken = await getSessionToken();
    await ipcClient.interventions.saveStepProgress(dto.workflowId || '', {
      step_id: dto.stepId,
      signature: dto.signatureData,
      signature_type: dto.type,
    } as AnyRecord, sessionToken);
  }

  async uploadStepPhotos(stepId: string, workflowId: string, files: File[]): Promise<{ urls: string[] }> {
    const sessionToken = await getSessionToken();
    const urls: string[] = [];
    for (const file of files) {
      const result = await ipcClient.photos.upload(workflowId, file.name, 'during', sessionToken);
      if (result && typeof result === 'object' && 'file_path' in (result as AnyRecord)) {
        urls.push((result as AnyRecord).file_path as string);
      }
    }
    return { urls };
  }
}

export function getWorkflowServiceInstance(): WorkflowServiceAdapter {
  return WorkflowServiceAdapter.getInstance();
}
