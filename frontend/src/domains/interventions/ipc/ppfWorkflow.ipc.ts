import type {
  AdvanceStepRequest,
  FinalizeInterventionRequest,
  SaveStepProgressRequest,
} from '@/lib/backend';
import { interventionsIpc } from './interventions.ipc';

export const ppfWorkflowIpc = {
  saveStepDraft: async (payload: SaveStepProgressRequest, sessionToken: string) =>
    interventionsIpc.saveStepProgress(payload, sessionToken),
  advanceStep: async (payload: AdvanceStepRequest, sessionToken: string) =>
    interventionsIpc.advanceStep(payload, sessionToken),
  finalize: async (payload: FinalizeInterventionRequest, sessionToken: string) =>
    interventionsIpc.finalize(payload, sessionToken),
};
