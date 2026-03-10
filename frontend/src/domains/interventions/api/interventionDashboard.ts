import { InterventionWorkflowService } from '../services/intervention-workflow.service';

export const interventionDashboard = {
  getActive: () => InterventionWorkflowService.getActive(),
  getRecent: () => InterventionWorkflowService.getRecent(),
};
