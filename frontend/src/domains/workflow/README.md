# Workflow Domain

Frontend bounded context for workflow execution, templates, calendar workflow views, and step utilities.

## Public Surface

### API (`api/`)
- `WorkflowDomainProvider` - Context provider for workflow data
- `useWorkflowExecution` - Hook for workflow execution
- `useWorkflowTemplates` - Hook for workflow templates
- `useWorkflow` - Hook for workflow operations
- `useWorkflowTemplate` - Hook for workflow template
- `useWorkflowStep` - Hook for workflow step

### IPC (`ipc/`)
- `workflowIpc.startWorkflow(options, sessionToken)` - Start a new workflow
- `workflowIpc.getWorkflowProgress(interventionId, sessionToken)` - Get workflow progress
- `workflowIpc.advanceWorkflowStep(stepData, sessionToken)` - Advance to next step
- `workflowIpc.getWorkflowDetails(interventionId, sessionToken)` - Get workflow details
- `workflowIpc.saveWorkflowStepProgress(stepData, sessionToken)` - Save step progress
- `workflowIpc.finalizeWorkflow(finalizeData, sessionToken)` - Finalize workflow
- `workflowIpc.getWorkflowForTask(taskId, sessionToken)` - Get workflow for a task
- `workflowIpc.getLatestWorkflowForTask(taskId, sessionToken)` - Get latest workflow
- `workflowIpc.getStepDetails(stepId, sessionToken)` - Get step details
- `workflowIpc.listActiveWorkflows(filters, sessionToken)` - List active workflows
- `workflowIpc.listCompletedWorkflows(filters, sessionToken)` - List completed workflows
- `workflowIpc.updateWorkflow(interventionId, data, sessionToken)` - Update workflow

### Services (`services/`)
- `WorkflowService` - Business logic for workflow operations
  - `startWorkflow(options, sessionToken)` - Start workflow
  - `getWorkflowState(interventionId, sessionToken)` - Get workflow state
  - `advanceStep(stepData, sessionToken)` - Advance workflow step
  - `saveStepProgress(stepData, sessionToken)` - Save step progress
  - `finalizeWorkflow(finalizeData, sessionToken)` - Finalize workflow
  - `getWorkflowForTask(taskId, sessionToken)` - Get workflow for task
  - `getActiveWorkflows(filters, sessionToken)` - Get active workflows
  - `getCompletedWorkflows(filters, sessionToken)` - Get completed workflows
  - `getWorkflowMetrics(sessionToken)` - Get workflow metrics

### Components (`components/`)
- `WorkflowExecutionDashboard` - Workflow execution dashboard
- `CalendarDashboard` - Calendar integration for workflows
- `CalendarView` - Calendar view component
- `WorkflowStep` - Workflow step component
- `PhotoUpload` - Photo upload component
- `WorkflowProgressBar` - Workflow progress bar
- `WorkflowTemplateEditor` - Workflow template editor
- `WorkflowNavigationButton` - Workflow navigation button

## Architecture

```
┌─────────────────────────────────────────────┐
│         Components & Hooks                  │
│ (WorkflowExecutionDashboard, useWorkflow)    │
└────────────┬──────────────────────────────┘
             │
┌────────────▼──────────────────────────────┐
│         Services Layer                      │
│        (WorkflowService)                   │
└────────────┬──────────────────────────────┘
             │
┌────────────▼──────────────────────────────┐
│           IPC Layer                        │
│        (workflowIpc)                      │
└────────────┬──────────────────────────────┘
             │
┌────────────▼──────────────────────────────┐
│     Delegates to Interventions IPC        │
│       (interventionsIpc)                 │
└────────────┬──────────────────────────────┘
             │
┌────────────▼──────────────────────────────┐
│        Backend Commands                   │
│   (intervention_workflow,                   │
│    intervention_progress)                   │
└─────────────────────────────────────────────┘
```

## Design Note

The workflow domain does not have a corresponding backend domain. Instead, it delegates to the **interventions** domain for all operations. The workflow IPC layer provides a more workflow-focused API that:

1. Wraps interventions IPC with workflow-specific semantics
2. Provides workflow state management
3. Calculates workflow-specific metrics (progress, success rates, quality pass rates)
4. Offers workflow-specific data transformations

## Backend Commands (via Interventions Domain)

### Intervention Workflow Commands
- `intervention_workflow` with actions:
  - `Start` - Start new intervention/workflow
  - `Get` - Get intervention details
  - `Update` - Update intervention
  - `Finalize` - Finalize intervention/workflow

### Intervention Progress Commands
- `intervention_progress` with actions:
  - `AdvanceStep` - Advance to next step
  - `GetStep` - Get step details
  - `Get` - Get intervention progress
  - `SaveStepProgress` - Save step progress without advancing

### Intervention Management Commands
- `intervention_management` with actions:
  - `List` - List interventions with filters

## Workflow State

The workflow state includes:
- `intervention` - The underlying intervention data
- `currentStep` - The currently active step
- `progress` - Progress percentage (0-100)
- `isCompleted` - Whether the workflow is completed
- `canAdvance` - Whether the workflow can advance to the next step
- `canFinalize` - Whether the workflow can be finalized

## Workflow Metrics

The workflow service calculates:
- `totalWorkflows` - Total number of workflows
- `activeWorkflows` - Number of active workflows
- `completedWorkflows` - Number of completed workflows
- `averageCompletionTime` - Average time to complete workflows (in minutes)
- `stepSuccessRate` - Percentage of steps completed successfully
- `qualityPassRate` - Percentage of steps that passed quality checks

## Usage Example

```typescript
import { useWorkflow } from '@/domains/workflow';

function WorkflowComponent({ taskId, sessionToken }) {
  const {
    startWorkflow,
    advanceStep,
    getWorkflowForTask
  } = useWorkflow();

  const handleStart = async () => {
    const workflow = await startWorkflow({
      taskId,
      ppf_zones: ['hood', 'roof'],
      film_type: 'XPEL ULTIMATE PLUS',
      // ... other fields
    }, sessionToken);
    
    console.log('Workflow started:', workflow);
  };

  const handleAdvanceStep = async (stepData) => {
    const result = await advanceStep({
      interventionId: 'intervention-1',
      stepId: 'step-1',
      collected_data: { measurements: {} },
      photos: [],
      notes: '',
      quality_check_passed: true,
      issues: []
    }, sessionToken);
    
    console.log('Step advanced:', result);
  };

  return (
    <button onClick={handleStart}>Start Workflow</button>
  );
}
```

## Testing

Unit tests are located in `__tests__/`:
- `workflow.ipc.test.ts` - IPC layer tests
- `workflow.service.test.ts` - Service layer tests

## Types

### WorkflowStartOptions
Extended version of `StartInterventionRequest` with workflow-specific fields.

### WorkflowStepData
Extended version of `AdvanceStepRequest` with workflow-specific fields.

### WorkflowStepSaveData
Extended version of `SaveStepProgressRequest` with workflow-specific fields.

### WorkflowFinalizeData
Extended version of `FinalizeInterventionRequest` with workflow-specific fields.

### WorkflowState
Represents the current state of a workflow including progress and capabilities.

### WorkflowMetrics
Aggregated metrics across all workflows.
