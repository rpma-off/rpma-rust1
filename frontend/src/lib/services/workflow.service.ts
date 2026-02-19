/**
 * Workflow Service
 * Manages workflow execution and state
 */

import { ipcClient } from '@/lib/ipc';
import { ApiResponse } from '@/types';
import type {
  AdvanceStepRequest,
  Intervention,
  InterventionStep,
  JsonObject,
  JsonValue,
  SaveStepProgressRequest,
  StartInterventionRequest,
  Task,
} from '@/lib/backend';
import { AuthSecureStorage } from '@/lib/secureStorage';

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  taskId: string;
  templateId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  currentStepId: string | null;
  steps: WorkflowExecutionStep[];
  startedAt?: string;
  completedAt?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecutionStep {
  id: string;
  workflowExecutionId: string;
  stepId: string;
  stepOrder: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt?: string | null;
  completedAt?: string | null;
  durationSeconds: number;
  data?: Record<string, unknown>;
  checklistCompletion: Record<string, unknown>;
  startedBy?: string | null;
  completedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  photos?: string[];
}

export interface CreateWorkflowExecutionDTO {
  taskId: string;
  templateId: string;
}

export interface StartTimingDTO {
  workflowExecutionId: string;
  stepId: string;
}

export interface SignatureDTO {
  workflowExecutionId: string;
  stepId: string;
  signature: string;
}

const DEFAULT_TEMPLATE_ID = 'ppf-workflow-template';

function toIsoDate(value: unknown): string {
  if (value === null || value === undefined) {
    return new Date().toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  if (typeof value === 'bigint') {
    return new Date(Number(value)).toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return new Date().toISOString();
}

function normalizeWorkflowStatus(status: string): WorkflowExecution['status'] {
  if (status === 'completed') return 'completed';
  if (status === 'failed') return 'failed';
  if (status === 'in_progress' || status === 'paused') return 'in_progress';
  return 'pending';
}

function normalizeStepStatus(status: string): WorkflowExecutionStep['status'] {
  if (status === 'completed') return 'completed';
  if (status === 'failed') return 'failed';
  if (status === 'skipped') return 'failed';
  if (status === 'in_progress' || status === 'paused') return 'in_progress';
  return 'pending';
}

function mapInterventionToWorkflow(
  intervention: Partial<Intervention> & Record<string, unknown>
): WorkflowExecution {
  return {
    id: String(intervention.id ?? ''),
    workflowId: String(intervention.id ?? ''),
    taskId: String(intervention.task_id ?? ''),
    templateId: DEFAULT_TEMPLATE_ID,
    status: normalizeWorkflowStatus(String(intervention.status ?? 'pending')),
    currentStepId: intervention.current_step?.toString() ?? null,
    steps: [],
    startedAt: intervention.started_at ? String(intervention.started_at) : undefined,
    completedAt: intervention.completed_at ? String(intervention.completed_at) : undefined,
    createdBy: String(intervention.created_by ?? intervention.technician_id ?? ''),
    updatedBy: String(intervention.updated_by ?? intervention.technician_id ?? ''),
    createdAt: toIsoDate(intervention.created_at),
    updatedAt: toIsoDate(intervention.updated_at),
  };
}

function mapInterventionStep(
  step: Partial<InterventionStep> & Record<string, unknown>
): WorkflowExecutionStep {
  return {
    id: String(step.id ?? ''),
    workflowExecutionId: String(step.intervention_id ?? ''),
    stepId: String(step.id ?? ''),
    stepOrder: Number(step.step_number ?? 0),
    status: normalizeStepStatus(String(step.step_status ?? 'pending')),
    startedAt: step.started_at ? String(step.started_at) : null,
    completedAt: step.completed_at ? String(step.completed_at) : null,
    durationSeconds: Number(step.duration_seconds ?? 0),
    data: (typeof step.step_data === 'object' && step.step_data !== null
      ? (step.step_data as Record<string, unknown>)
      : undefined),
    checklistCompletion: (typeof step.collected_data === 'object' && step.collected_data !== null
      ? (step.collected_data as Record<string, unknown>)
      : {}),
    startedBy: (step.started_by as string | null | undefined) ?? null,
    completedBy: (step.approved_by as string | null | undefined) ?? null,
    createdAt: toIsoDate(step.created_at),
    updatedAt: toIsoDate(step.updated_at),
    notes: step.notes ?? undefined,
    photos: step.photo_urls ?? undefined,
  };
}

function parseInterventionCandidate(payload: unknown): Intervention | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;

  if ('intervention' in record && record.intervention && typeof record.intervention === 'object') {
    return record.intervention as Intervention;
  }

  if ('interventions' in record && Array.isArray(record.interventions) && record.interventions.length > 0) {
    return record.interventions[0] as Intervention;
  }

  if ('type' in record) {
    const typed = record as { type?: string; intervention?: Intervention | null; interventions?: Intervention[] };
    if (typed.type === 'ActiveRetrieved' && typed.intervention) return typed.intervention;
    if (typed.type === 'ActiveByTask' && typed.interventions && typed.interventions.length > 0) {
      return typed.interventions[0];
    }
  }

  return null;
}

async function requireSessionToken(): Promise<string> {
  const session = await AuthSecureStorage.getSession();
  if (!session?.token) {
    throw new Error('Authentication required');
  }
  return session.token;
}

function buildStartRequest(task: Task): StartInterventionRequest {
  const filmType: StartInterventionRequest['film_type'] =
    task.lot_film === 'premium' ||
    task.lot_film === 'matte' ||
    task.lot_film === 'colored'
      ? task.lot_film
      : 'standard';

  return {
    task_id: task.id,
    intervention_number: task.task_number ?? null,
    ppf_zones: task.ppf_zones ?? [],
    custom_zones: task.custom_ppf_zones ?? null,
    film_type: filmType,
    film_brand: null,
    film_model: null,
    weather_condition: 'unknown',
    lighting_condition: 'unknown',
    work_location: 'workshop',
    temperature: null,
    humidity: null,
    technician_id: task.technician_id ?? task.created_by ?? 'system',
    assistant_ids: null,
    scheduled_start: task.scheduled_date ?? new Date().toISOString(),
    estimated_duration: task.estimated_duration ?? 120,
    gps_coordinates: null,
    address: task.customer_address ?? null,
    notes: task.notes ?? null,
    customer_requirements: null,
    special_instructions: null,
  };
}

export class WorkflowService {
  private static instance: WorkflowService;

  static getInstance(): WorkflowService {
    if (!WorkflowService.instance) {
      WorkflowService.instance = new WorkflowService();
    }
    return WorkflowService.instance;
  }

  async createWorkflowExecution(dto: CreateWorkflowExecutionDTO): Promise<WorkflowExecution> {
    return this.startWorkflowExecution(dto);
  }

  async getWorkflowExecution(id: string): Promise<WorkflowExecution | null> {
    const sessionToken = await requireSessionToken();
    const intervention = await ipcClient.interventions.get(id, sessionToken);
    if (!intervention) return null;
    return mapInterventionToWorkflow(intervention);
  }

  async startStepTiming(dto: StartTimingDTO): Promise<void> {
    const sessionToken = await requireSessionToken();
    await ipcClient.interventions.getStep(dto.stepId, sessionToken);
  }

  async completeStep(stepId: string, data?: unknown): Promise<void> {
    const sessionToken = await requireSessionToken();
    const step = await ipcClient.interventions.getStep(stepId, sessionToken);
    if (!step) {
      throw new Error('Workflow step not found');
    }

    const saveRequest: SaveStepProgressRequest = {
      step_id: stepId,
      collected_data: (data ?? {}) as JsonValue,
      notes: null,
      photos: null,
    };
    await ipcClient.interventions.saveStepProgress(saveRequest, sessionToken);

    const advanceRequest: AdvanceStepRequest = {
      intervention_id: step.intervention_id,
      step_id: stepId,
      collected_data: (data ?? {}) as JsonValue,
      photos: null,
      notes: null,
      quality_check_passed: true,
      issues: null,
    };
    await ipcClient.interventions.advanceStep(advanceRequest, sessionToken);
  }

  async addSignature(dto: SignatureDTO): Promise<void> {
    const sessionToken = await requireSessionToken();
    const payload: SaveStepProgressRequest = {
      step_id: dto.stepId,
      collected_data: {
        customer_signature: dto.signature,
        signed_at: new Date().toISOString(),
      } as JsonValue,
      notes: null,
      photos: null,
    };
    await ipcClient.interventions.saveStepProgress(payload, sessionToken);
  }

  async getWorkflowByTaskId(taskId: string): Promise<WorkflowExecution | null> {
    const sessionToken = await requireSessionToken();
    const active = await ipcClient.interventions.getActiveByTask(taskId, sessionToken);
    const activeIntervention = parseInterventionCandidate(active);
    if (activeIntervention) {
      return mapInterventionToWorkflow(activeIntervention);
    }

    const latest = await ipcClient.interventions.getLatestByTask(taskId, sessionToken);
    const latestIntervention = parseInterventionCandidate(latest);
    if (latestIntervention) {
      return mapInterventionToWorkflow(latestIntervention);
    }

    return null;
  }

  async getWorkflowSteps(workflowId: string): Promise<WorkflowExecutionStep[]> {
    const sessionToken = await requireSessionToken();
    const progress = await ipcClient.interventions.getProgress(workflowId, sessionToken);
    const steps = progress?.steps ?? [];
    return steps.map(mapInterventionStep);
  }

  async startWorkflowExecution(dto: CreateWorkflowExecutionDTO): Promise<WorkflowExecution> {
    const sessionToken = await requireSessionToken();

    const existing = await this.getWorkflowByTaskId(dto.taskId);
    if (existing) return existing;

    const task = await ipcClient.tasks.get(dto.taskId, sessionToken);
    if (!task) {
      throw new Error(`Task ${dto.taskId} not found`);
    }

    const request = buildStartRequest(task);
    const started = await ipcClient.interventions.start(request, sessionToken);
    return mapInterventionToWorkflow(
      started.intervention as unknown as Partial<Intervention> & Record<string, unknown>
    );
  }

  async startStep(stepId: string, workflowId: string, userId: string): Promise<void> {
    await this.updateStepData(stepId, workflowId, { status: 'in_progress' }, userId);
  }

  async skipStep(stepId: string, workflowId: string, userId: string, reason?: string): Promise<void> {
    await this.updateStepData(stepId, workflowId, { skipped: true, reason: reason ?? null }, userId);
  }

  async updateWorkflowExecution(id: string, updates: Partial<WorkflowExecution>): Promise<WorkflowExecution> {
    const sessionToken = await requireSessionToken();
    await ipcClient.interventions.updateWorkflow(id, updates as unknown as JsonObject, sessionToken);
    const updated = await this.getWorkflowExecution(id);
    if (!updated) {
      throw new Error(`Workflow ${id} not found after update`);
    }
    return updated;
  }

  async updateStepData(stepId: string, _workflowId: string, data: unknown, _userId: string): Promise<void> {
    const sessionToken = await requireSessionToken();
    const request: SaveStepProgressRequest = {
      step_id: stepId,
      collected_data: (data ?? {}) as JsonValue,
      notes: null,
      photos: null,
    };
    await ipcClient.interventions.saveStepProgress(request, sessionToken);
  }

  async pauseStepTiming(stepId: string, workflowId: string, userId: string): Promise<void> {
    await this.updateStepData(stepId, workflowId, { timing_paused: true }, userId);
  }

  async resumeStepTiming(stepId: string, workflowId: string, userId: string): Promise<void> {
    await this.updateStepData(stepId, workflowId, { timing_paused: false }, userId);
  }

  async getWorkflowStep(id: string, sessionToken: string): Promise<ApiResponse<WorkflowExecutionStep>> {
    try {
      const response = await ipcClient.interventions.getStep(id, sessionToken);
      return { success: true, data: mapInterventionStep(response) };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message };
    }
  }

  async pauseWorkflow(id: string, sessionToken: string): Promise<ApiResponse<WorkflowExecution>> {
    try {
      await ipcClient.interventions.updateWorkflow(id, { status: 'paused' }, sessionToken);
      const data = await this.getWorkflowExecution(id);
      if (!data) {
        return { success: false, error: `Workflow ${id} not found` };
      }
      return { success: true, data };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message };
    }
  }

  async resumeWorkflow(id: string, sessionToken: string): Promise<ApiResponse<WorkflowExecution>> {
    try {
      await ipcClient.interventions.updateWorkflow(id, { status: 'in_progress' }, sessionToken);
      const data = await this.getWorkflowExecution(id);
      if (!data) {
        return { success: false, error: `Workflow ${id} not found` };
      }
      return { success: true, data };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: err.message };
    }
  }

  async uploadStepPhotos(stepId: string, workflowId: string, photos: File[], _userId: string): Promise<{ urls: string[] }> {
    const sessionToken = await requireSessionToken();
    const urls = photos.map((photo) => `local://${workflowId}/${stepId}/${encodeURIComponent(photo.name)}`);
    const request: SaveStepProgressRequest = {
      step_id: stepId,
      collected_data: {
        uploaded_photos: urls,
        uploaded_at: new Date().toISOString(),
      } as JsonValue,
      notes: null,
      photos: urls,
    };
    await ipcClient.interventions.saveStepProgress(request, sessionToken);
    return { urls };
  }
}

export const workflowService = WorkflowService.getInstance();
