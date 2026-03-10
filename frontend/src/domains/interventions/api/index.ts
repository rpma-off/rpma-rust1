/** TODO: document */
export { PPFWorkflowProvider, usePPFWorkflow } from './PPFWorkflowProvider';
/** TODO: document */
export { WorkflowProvider, useWorkflow } from './WorkflowProvider';
/** TODO: document */
export { useInterventionWorkflow } from './useInterventionWorkflow';
/** TODO: document */
export { useInterventionData, useWorkflowStepData } from './useInterventionData';
/** TODO: document */
export { useInterventionActions } from './useInterventionActions';
/** TODO: document */
export { useInstallationStep, ZONE_CHECKLIST } from '../hooks/useInstallationStep';
/** TODO: document */
export { usePpfWorkflow } from '../hooks/usePpfWorkflow';

/** TODO: document */
export { interventionDashboard } from './interventionDashboard';
/** TODO: document */
export {
  InterventionWorkflowService,
  interventionWorkflowService,
} from '../services/intervention-workflow.service';
/** TODO: document */
export { interventionsIpc } from '../ipc/interventions.ipc';
/** TODO: document */
export { ppfWorkflowIpc } from '../ipc/ppfWorkflow.ipc';
/** TODO: document */
export {
  PPFPhotoService,
  ppfPhotoService as PPFPhotoServiceInstance,
  type PPFPhoto,
  type MobileCameraConfig,
  type RealTimeValidationResult,
} from '../services/photo.service';
/** TODO: document */
export {
  GeolocationService,
  geolocationService as GeolocationServiceInstance,
} from '../services/geolocation.service';
/** TODO: document */
export { QualityControlService } from '../services/quality-control.service';
/** TODO: document */
export { ppfService, type PPFStep } from '../services/ppf';

/** TODO: document */
export { PPFWorkflowHeader } from '../components/workflow/ppf/PPFWorkflowHeader';
/** TODO: document */
export { PPFStepProgress } from '../components/workflow/ppf/PPFStepProgress';
/** TODO: document */
export { VehicleDiagram } from '../components/workflow/ppf/VehicleDiagram';
/** TODO: document */
export { PpfWorkflowLayout } from '../components/ppf/PpfWorkflowLayout';
/** TODO: document */
export { PpfHeaderBand } from '../components/ppf/PpfHeaderBand';
/** TODO: document */
export { PpfStepperBand } from '../components/ppf/PpfStepperBand';
/** TODO: document */
export { PpfStepHero } from '../components/ppf/PpfStepHero';
/** TODO: document */
export { PpfChecklist } from '../components/ppf/PpfChecklist';
/** TODO: document */
export { PpfPhotoGrid } from '../components/ppf/PpfPhotoGrid';
/** TODO: document */
export { PpfDefectsPanel } from '../components/ppf/PpfDefectsPanel';
/** TODO: document */
export { PpfZoneTracker } from '../components/ppf/PpfZoneTracker';
/** TODO: document */
export { PpfQualitySlider } from '../components/ppf/PpfQualitySlider';
/** TODO: document */
export { PPF_STEP_CONFIG } from '../components/ppf/ppfWorkflow.config';
/** TODO: document */
export { WorkflowNavigationButton } from '../components/workflow/WorkflowNavigationButton';
/** TODO: document */
export { WorkflowExecutionDashboard } from '../components/WorkflowExecutionDashboard';
/** TODO: document */
export type { Defect } from '../components/workflow/ppf/VehicleDiagram';

/** TODO: document */
export {
  getPPFStepPath,
  getNextPPFStepId,
  getPPFStepTitle,
  getPPFStepDescription,
  buildPPFStepsFromData,
  getCurrentPPFStepId,
} from '../utils/ppf-workflow';

/** TODO: document */
export {
  buildStepExportPayload,
  downloadJsonFile,
  getEffectiveStepData,
} from '../utils/step-export';
/** TODO: document */
export type { StepExportPayload } from '../utils/step-export';


/** TODO: document */
export {
  WorkflowService,
  workflowService,
  WorkflowTemplatesService,
  workflowTemplatesService,
} from '../workflow/services';
/** TODO: document */
export type {
  CreateWorkflowExecutionDTO,
  StartTimingDTO,
  SignatureDTO,
  WorkflowTemplate,
  WorkflowStepTemplate,
  SOPInstruction,
} from '../workflow/services';

/** TODO: document */
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

// Raw backend model types surfaced for consumers (e.g. reports) that need
// the canonical Intervention/InterventionStep shapes.
export type { Intervention, InterventionStep } from '../ipc/interventions.ipc';
