export { PPFWorkflowProvider, usePPFWorkflow } from './PPFWorkflowProvider';
export { WorkflowProvider, useWorkflow } from './WorkflowProvider';
export { useInterventionWorkflow } from './useInterventionWorkflow';
export { useInterventionData, useWorkflowStepData } from './useInterventionData';
export { useInterventionActions } from './useInterventionActions';
export { useInterventionSync } from '../hooks/useInterventionSync';
export { useInterventionState } from '../hooks/useInterventionState';

export { PPFWorkflowHeader } from '../components/workflow/ppf/PPFWorkflowHeader';
export { PPFStepProgress } from '../components/workflow/ppf/PPFStepProgress';
export { VehicleDiagram } from '../components/workflow/ppf/VehicleDiagram';
export { WorkflowNavigationButton } from '../components/WorkflowNavigationButton';
export type { Defect } from '../components/workflow/ppf/VehicleDiagram';

export { InterventionWorkflowService, interventionWorkflowService } from '../services/intervention-workflow.service';
export { PPFPhotoService } from '../services/photo.service';
export type { PPFPhoto, MobileCameraConfig, RealTimeValidationResult } from '../services/photo.service';
export { QualityControlService } from '../services/quality-control.service';
export { GeolocationService } from '../services/geolocation.service';
export type { PPFStep } from '../services/ppf';

export {
  getPPFStepPath,
  getNextPPFStepId,
  getPPFStepTitle,
  getPPFStepDescription,
  buildPPFStepsFromData,
  getCurrentPPFStepId,
} from '@/lib/ppf-workflow';

export type {
  PPFInterventionData,
  PPFInterventionStep,
  PPFInterventionStepStatus,
  PPFStepId,
  StartInterventionDTO,
  AdvanceStepDTO,
  FinalizeInterventionDTO,
  InterventionCreationResponse,
  StepProgressResponse,
  InterventionFinalizationResponse,
  WorkflowExecution,
  WorkflowExecutionStep,
  WorkflowStepStatus,
  TaskWorkflowProgress,
} from './types';
