export const interventionKeys = {
  all: ['interventions'],
  byTask: (taskId: string) => [...interventionKeys.all, 'task', taskId],
  byTaskData: (taskId: string) => [...interventionKeys.all, 'data', taskId],
  steps: (interventionId: string) => [...interventionKeys.all, 'steps', interventionId],
  activeForTask: (taskId: string) => [...interventionKeys.all, 'active', taskId],
  ppfWorkflow: (taskId: string) => [...interventionKeys.all, 'ppf-workflow', taskId],
  ppfIntervention: (taskId: string) => [...interventionKeys.all, 'ppf-intervention', taskId],
  ppfInterventionSteps: (interventionId: string) => [...interventionKeys.all, 'ppf-steps', interventionId],
  photos: (interventionId: string) => [...interventionKeys.all, 'photos', interventionId],
};

export const taskKeys = {
  all: ['tasks'],
  lists: () => [...taskKeys.all, 'list'],
  byId: (taskId: string) => [...taskKeys.all, taskId],
};

export const quoteKeys = {
  all: ['quotes'],
  lists: () => [...quoteKeys.all, 'list'],
  byId: (quoteId: string) => [...quoteKeys.all, quoteId],
};

export const clientKeys = {
  all: ['clients'],
  lists: () => [...clientKeys.all, 'list'],
  byId: (clientId: string) => [...clientKeys.all, clientId],
};

export const inventoryKeys = {
  all: ['inventory'],
  materials: () => [...inventoryKeys.all, 'materials'],
  byId: (materialId: string) => [...inventoryKeys.all, materialId],
};
