import { ipcClient } from '@/lib/ipc';
import type {
  AdvanceStepRequest,
  FinalizeInterventionRequest,
  SaveStepProgressRequest,
  StartInterventionRequest,
} from '@/lib/backend';

export const interventionsIpc = {
  start: (data: StartInterventionRequest, sessionToken: string) =>
    ipcClient.interventions.start(data, sessionToken),

  get: (id: string, sessionToken: string) =>
    ipcClient.interventions.get(id, sessionToken),

  list: (filters: Record<string, unknown>, sessionToken: string) =>
    ipcClient.interventions.list(filters, sessionToken),

  getActiveByTask: (taskId: string, sessionToken: string) =>
    ipcClient.interventions.getActiveByTask(taskId, sessionToken),

  getLatestByTask: (taskId: string, sessionToken: string) =>
    ipcClient.interventions.getLatestByTask(taskId, sessionToken),

  getProgress: (interventionId: string, sessionToken: string) =>
    ipcClient.interventions.getProgress(interventionId, sessionToken),

  getSteps: (interventionId: string, sessionToken: string) =>
    ipcClient.interventions.getSteps(interventionId, sessionToken),

  getStep: (stepId: string, sessionToken: string) =>
    ipcClient.interventions.getStep(stepId, sessionToken),

  advanceStep: (data: AdvanceStepRequest, sessionToken: string) =>
    ipcClient.interventions.advanceStep(data, sessionToken),

  saveStepProgress: (data: SaveStepProgressRequest, sessionToken: string) =>
    ipcClient.interventions.saveStepProgress(data, sessionToken),

  finalize: (data: FinalizeInterventionRequest, sessionToken: string) =>
    ipcClient.interventions.finalize(data, sessionToken),
};
