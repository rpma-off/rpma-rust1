export const interventionKeys = {
  all: ['interventions'],
  byTask: (taskId: string) => [...interventionKeys.all, 'task', taskId],
  byTaskData: (taskId: string) => ['intervention-data', taskId],
  steps: (interventionId: string) => [...interventionKeys.all, 'steps', interventionId],
  activeForTask: (taskId: string) => [...interventionKeys.all, 'active', taskId],
  ppfWorkflow: (taskId: string) => ['ppf-workflow', taskId],
  ppfIntervention: (taskId: string) => ['ppf-intervention', taskId],
  ppfInterventionSteps: (interventionId: string) => ['ppf-intervention-steps', interventionId],
};

export const taskKeys = {
  all: ['tasks'],
  byId: (taskId: string) => [...taskKeys.all, taskId],
};

export const quoteKeys = {
  all: ['quotes'],
  byId: (quoteId: string) => [...quoteKeys.all, quoteId],
};
