/**
 * workflow Domain - Public API
 */

export { WorkflowDomainProvider, useWorkflowDomainContext } from './WorkflowDomainProvider';
export { useWorkflowExecution } from './useWorkflowExecution';
export { useWorkflowTemplates } from './useWorkflowTemplates';
export { default as useWorkflow } from '../hooks/useWorkflow';
export { useWorkflowTemplate, useWorkflowStep } from '../hooks/useWorkflowTemplate';

export { CalendarDashboard } from '../components/CalendarDashboard';
export { CalendarView } from '../components/CalendarView';
export { WorkflowExecutionDashboard } from '../components/WorkflowExecutionDashboard';
export { PhotoUpload } from '../components/PhotoUpload';
export { PhotoUploadZone } from '../components/PhotoUploadZone';
export { SignatureCapture } from '../components/SignatureCapture';

export {
  workflowService,
  WorkflowService,
  workflowTemplatesService,
  taskWorkflowSyncService,
} from '../server';

export type {
  WorkflowExecution,
  WorkflowExecutionStep,
  CreateWorkflowExecutionDTO,
  StartTimingDTO,
  SignatureDTO,
  WorkflowTemplate,
  WorkflowStepTemplate,
  SOPInstruction,
} from './types';
