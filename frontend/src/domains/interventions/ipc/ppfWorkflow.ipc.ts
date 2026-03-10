import type {
  AdvanceStepRequest,
  FinalizeInterventionRequest,
  SaveStepProgressRequest,
} from '@/lib/backend';
import { interventionsIpc } from './interventions.ipc';

export const ppfWorkflowIpc = {
  saveStepDraft: (payload: SaveStepProgressRequest) =>
    interventionsIpc.saveStepProgress(payload),
  advanceStep: (payload: AdvanceStepRequest) =>
    interventionsIpc.advanceStep(payload),
  finalize: (payload: FinalizeInterventionRequest) =>
    interventionsIpc.finalize(payload),
};
