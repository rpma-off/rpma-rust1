export const interventionKeys = {
  all: ['interventions'],
  byTask: (taskId: string) => [...interventionKeys.all, 'task', taskId],
  steps: (interventionId: string) => [...interventionKeys.all, 'steps', interventionId],
  activeForTask: (taskId: string) => [...interventionKeys.all, 'active', taskId],
  ppfWorkflow: (taskId: string) => ['ppf-workflow', taskId],
  ppfIntervention: (taskId: string) => ['ppf-intervention', taskId],
  ppfInterventionSteps: (interventionId: string) => ['ppf-intervention-steps', interventionId],
};