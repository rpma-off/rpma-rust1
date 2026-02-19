export { PPFWorkflowProvider, usePPFWorkflow } from './PPFWorkflowProvider';
export { WorkflowProvider, useWorkflow } from './WorkflowProvider';
export { useInterventionWorkflow } from './useInterventionWorkflow';
export { useInterventionData, useWorkflowStepData } from './useInterventionData';
export { useInterventionActions } from './useInterventionActions';
export { useInterventionSync } from '../hooks/useInterventionSync';
export { useInterventionState } from '../hooks/useInterventionState';
export { interventionDashboard } from './interventionDashboard';
export {
  InterventionWorkflowService,
  interventionWorkflowService,
} from '../services/intervention-workflow.service';
export {
  PPFPhotoService,
  ppfPhotoService as PPFPhotoServiceInstance,
  type PPFPhoto,
  type MobileCameraConfig,
  type RealTimeValidationResult,
} from '../services/photo.service';
export {
  GeolocationService,
  geolocationService as GeolocationServiceInstance,
} from '../services/geolocation.service';
export { QualityControlService } from '../services/quality-control.service';
export { ppfService, type PPFStep } from '../services/ppf';

export { PPFWorkflowHeader } from '../components/workflow/ppf/PPFWorkflowHeader';
export { PPFStepProgress } from '../components/workflow/ppf/PPFStepProgress';
export { VehicleDiagram } from '../components/workflow/ppf/VehicleDiagram';
export { WorkflowNavigationButton } from '../components/WorkflowNavigationButton';
export type { Defect } from '../components/workflow/ppf/VehicleDiagram';

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
