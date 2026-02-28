export { PPFWorkflowProvider, usePPFWorkflow } from './PPFWorkflowProvider';
export { WorkflowProvider, useWorkflow } from './WorkflowProvider';
export { useInterventionWorkflow } from './useInterventionWorkflow';
export { useInterventionData, useWorkflowStepData } from './useInterventionData';
export { useInterventionActions } from './useInterventionActions';
export { useInterventionSync } from '../hooks/useInterventionSync';
export { useInterventionState } from '../hooks/useInterventionState';
export { usePpfWorkflow } from '../hooks/usePpfWorkflow';
export { interventionDashboard } from './interventionDashboard';
export {
  InterventionWorkflowService,
  interventionWorkflowService,
} from '../services/intervention-workflow.service';
export { interventionsIpc } from '../ipc/interventions.ipc';
export { ppfWorkflowIpc } from '../ipc/ppfWorkflow.ipc';
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

export { DesktopGPS } from '../components/GPS/DesktopGPS';

export { PPFWorkflowHeader } from '../components/workflow/ppf/PPFWorkflowHeader';
export { PPFStepProgress } from '../components/workflow/ppf/PPFStepProgress';
export { VehicleDiagram } from '../components/workflow/ppf/VehicleDiagram';
export { PpfWorkflowLayout } from '../components/ppf/PpfWorkflowLayout';
export { PpfHeaderBand } from '../components/ppf/PpfHeaderBand';
export { PpfStepperBand } from '../components/ppf/PpfStepperBand';
export { PpfStepHero } from '../components/ppf/PpfStepHero';
export { PpfChecklist } from '../components/ppf/PpfChecklist';
export { PpfPhotoGrid } from '../components/ppf/PpfPhotoGrid';
export { PpfDefectsPanel } from '../components/ppf/PpfDefectsPanel';
export { PpfZoneTracker } from '../components/ppf/PpfZoneTracker';
export { PpfQualitySlider } from '../components/ppf/PpfQualitySlider';
export { PPF_STEP_CONFIG } from '../components/ppf/ppfWorkflow.config';
export { WorkflowNavigationButton } from '../components/workflow/WorkflowNavigationButton';
export type { Defect } from '../components/workflow/ppf/VehicleDiagram';

export {
  getPPFStepPath,
  getNextPPFStepId,
  getPPFStepTitle,
  getPPFStepDescription,
  buildPPFStepsFromData,
  getCurrentPPFStepId,
} from '../utils/ppf-workflow';

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
