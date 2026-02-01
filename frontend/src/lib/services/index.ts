// Services index

export * from './entities/client.service';
export * from './entities/task.service';
export * from './entities/user.service';
export * from './entities/settings.service';
export * from './entities/settings-client.service';
export * from './entities/configuration.service';
export * from './entities/analytics.service';
export * from './entities/task-photo.service';
export * from './auth/auth.service';
export * from './core/base.service';
export * from './dashboard/dashboard-api.service';
export * from './ppf/intervention-workflow.service';

// Export service instances
export { taskService } from './entities/task.service';
export { interventionWorkflowService as workflowService } from './ppf/intervention-workflow.service';

// Also export WorkflowService if needed
export { InterventionWorkflowService as WorkflowService } from './ppf/intervention-workflow.service';