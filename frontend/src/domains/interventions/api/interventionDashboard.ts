import { InterventionWorkflowService } from '../services/intervention-workflow.service';

export const interventionDashboard = {
  getActive: (sessionToken: string) => InterventionWorkflowService.getActive(sessionToken),
  getRecent: (sessionToken: string) => InterventionWorkflowService.getRecent(sessionToken),
};
