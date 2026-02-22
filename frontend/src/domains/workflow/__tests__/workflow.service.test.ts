import { workflowService, WorkflowService } from '../services/workflow.service';
import { workflowIpc } from '../ipc/workflow.ipc';

jest.mock('../ipc/workflow.ipc', () => ({
  workflowIpc: {
    startWorkflow: jest.fn(),
    getWorkflowDetails: jest.fn(),
    advanceWorkflowStep: jest.fn(),
    saveWorkflowStepProgress: jest.fn(),
    finalizeWorkflow: jest.fn(),
    getWorkflowForTask: jest.fn(),
    listActiveWorkflows: jest.fn(),
    listCompletedWorkflows: jest.fn(),
  },
}));

const { workflowIpc: mockWorkflowIpc } = jest.requireMock('../ipc/workflow.ipc') as {
  workflowIpc: typeof workflowIpc;
};

describe('WorkflowService', () => {
  const mockSessionToken = 'test-session-token';
  const mockIntervention = {
    id: 'intervention-1',
    task_id: 'task-1',
    status: 'in_progress',
    started_at: new Date().toISOString(),
    completed_at: null,
    steps: [
      { id: 'step-1', status: 'completed', quality_check_passed: true },
      { id: 'step-2', status: 'in_progress', quality_check_passed: true },
      { id: 'step-3', status: 'pending', quality_check_passed: null },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startWorkflow', () => {
    it('should start workflow and return initial state', async () => {
      const options = { taskId: 'task-1' };
      const mockResponse = {
        intervention: mockIntervention,
        steps: mockIntervention.steps,
      };
      mockWorkflowIpc.startWorkflow.mockResolvedValue(mockResponse);

      const result = await workflowService.startWorkflow(options, mockSessionToken);

      expect(mockWorkflowIpc.startWorkflow).toHaveBeenCalledWith(options, mockSessionToken);
      expect(result.isCompleted).toBe(false);
      expect(result.canAdvance).toBe(true);
      expect(result.canFinalize).toBe(false);
      expect(result.progress).toBeGreaterThan(0);
    });
  });

  describe('getWorkflowState', () => {
    it('should get workflow details and return state', async () => {
      const mockResponse = {
        intervention: mockIntervention,
        currentStep: mockIntervention.steps[1],
        isCompleted: false,
        canFinalize: true,
      };
      mockWorkflowIpc.getWorkflowDetails.mockResolvedValue(mockResponse);

      const result = await workflowService.getWorkflowState('intervention-1', mockSessionToken);

      expect(mockWorkflowIpc.getWorkflowDetails).toHaveBeenCalledWith('intervention-1', mockSessionToken);
      expect(result.isCompleted).toBe(false);
      expect(result.canAdvance).toBe(true);
      expect(result.canFinalize).toBe(true);
    });
  });

  describe('advanceStep', () => {
    it('should advance step and return updated state', async () => {
      const stepData = {
        interventionId: 'intervention-1',
        stepId: 'step-2',
        collected_data: {},
        notes: '',
        photos: [],
        quality_check_passed: true,
        issues: [],
      };
      const mockResponse = {
        step: mockIntervention.steps[1],
        nextStep: mockIntervention.steps[2],
        progressPercentage: 75,
      };
      mockWorkflowIpc.advanceWorkflowStep.mockResolvedValue(mockResponse);

      const result = await workflowService.advanceStep(stepData, mockSessionToken);

      expect(mockWorkflowIpc.advanceWorkflowStep).toHaveBeenCalledWith(stepData, mockSessionToken);
      expect(result.progress).toBe(75);
      expect(result.canAdvance).toBe(true);
      expect(result.canFinalize).toBe(false);
    });
  });

  describe('getWorkflowForTask', () => {
    it('should return null when no workflow exists for task', async () => {
      const mockResponse = {
        intervention: null,
        isActive: false,
      };
      mockWorkflowIpc.getWorkflowForTask.mockResolvedValue(mockResponse);

      const result = await workflowService.getWorkflowForTask('task-1', mockSessionToken);

      expect(result).toBeNull();
    });

    it('should return workflow state when workflow exists', async () => {
      const mockResponse = {
        intervention: mockIntervention,
        isActive: true,
      };
      mockWorkflowIpc.getWorkflowForTask.mockResolvedValue(mockResponse);

      const result = await workflowService.getWorkflowForTask('task-1', mockSessionToken);

      expect(result).not.toBeNull();
      expect(result?.intervention).toEqual(mockIntervention);
      expect(result?.isActive).toBe(true);
    });
  });

  describe('getActiveWorkflows', () => {
    it('should return list of active workflows', async () => {
      const mockResponse = {
        workflows: [mockIntervention],
        total: 1,
      };
      mockWorkflowIpc.listActiveWorkflows.mockResolvedValue(mockResponse);

      const result = await workflowService.getActiveWorkflows({ limit: 10 }, mockSessionToken);

      expect(mockWorkflowIpc.listActiveWorkflows).toHaveBeenCalledWith({ limit: 10 }, mockSessionToken);
      expect(result.workflows).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.workflows[0].isCompleted).toBe(false);
    });
  });

  describe('getCompletedWorkflows', () => {
    it('should return list of completed workflows', async () => {
      const completedIntervention = { ...mockIntervention, status: 'completed' as const };
      const mockResponse = {
        workflows: [completedIntervention],
        total: 1,
      };
      mockWorkflowIpc.listCompletedWorkflows.mockResolvedValue(mockResponse);

      const result = await workflowService.getCompletedWorkflows({ limit: 10 }, mockSessionToken);

      expect(mockWorkflowIpc.listCompletedWorkflows).toHaveBeenCalledWith({ limit: 10 }, mockSessionToken);
      expect(result.workflows).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.workflows[0].isCompleted).toBe(true);
      expect(result.workflows[0].canAdvance).toBe(false);
    });
  });

  describe('calculateProgress', () => {
    it('should calculate progress correctly for completed steps', () => {
      const steps = [
        { status: 'completed', quality_check_passed: true },
        { status: 'completed', quality_check_passed: true },
        { status: 'pending', quality_check_passed: null },
      ];

      const progress = WorkflowService['calculateProgress'](steps);

      expect(progress).toBe(67);
    });

    it('should calculate progress correctly for in-progress steps', () => {
      const steps = [
        { status: 'completed', quality_check_passed: true },
        { status: 'in_progress', quality_check_passed: true },
        { status: 'pending', quality_check_passed: null },
      ];

      const progress = WorkflowService['calculateProgress'](steps);

      expect(progress).toBe(50);
    });

    it('should return 0 for empty steps', () => {
      const progress = WorkflowService['calculateProgress']([]);
      expect(progress).toBe(0);
    });
  });

  describe('calculateAverageCompletionTime', () => {
    it('should calculate average completion time in minutes', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const workflows = [
        {
          ...mockIntervention,
          status: 'completed' as const,
          started_at: oneHourAgo.toISOString(),
          completed_at: now.toISOString(),
        },
        {
          ...mockIntervention,
          status: 'completed' as const,
          started_at: twoHoursAgo.toISOString(),
          completed_at: oneHourAgo.toISOString(),
        },
      ];

      const avgTime = WorkflowService['calculateAverageCompletionTime'](workflows);

      expect(avgTime).toBe(90);
    });

    it('should return 0 when no completed workflows', () => {
      const avgTime = WorkflowService['calculateAverageCompletionTime']([mockIntervention]);
      expect(avgTime).toBe(0);
    });
  });

  describe('calculateStepSuccessRate', () => {
    it('should calculate step success rate', () => {
      const workflows = [
        {
          ...mockIntervention,
          steps: [
            { status: 'completed', quality_check_passed: true },
            { status: 'completed', quality_check_passed: false },
            { status: 'in_progress', quality_check_passed: null },
          ],
        },
      ];

      const successRate = WorkflowService['calculateStepSuccessRate'](workflows);

      expect(successRate).toBe(33);
    });

    it('should return 0 for empty workflows', () => {
      const successRate = WorkflowService['calculateStepSuccessRate']([]);
      expect(successRate).toBe(0);
    });
  });

  describe('calculateQualityPassRate', () => {
    it('should calculate quality pass rate', () => {
      const workflows = [
        {
          ...mockIntervention,
          steps: [
            { quality_check_passed: true },
            { quality_check_passed: true },
            { quality_check_passed: false },
          ],
        },
      ];

      const passRate = WorkflowService['calculateQualityPassRate'](workflows);

      expect(passRate).toBe(67);
    });

    it('should return 0 for empty workflows', () => {
      const passRate = WorkflowService['calculateQualityPassRate']([]);
      expect(passRate).toBe(0);
    });
  });

  describe('getWorkflowMetrics', () => {
    it('should calculate comprehensive workflow metrics', async () => {
      const activeResponse = { workflows: [mockIntervention], total: 1 };
      const completedIntervention = { ...mockIntervention, status: 'completed' as const };
      const completedResponse = { workflows: [completedIntervention], total: 1 };

      mockWorkflowIpc.listActiveWorkflows.mockResolvedValue(activeResponse);
      mockWorkflowIpc.listCompletedWorkflows.mockResolvedValue(completedResponse);

      const metrics = await workflowService.getWorkflowMetrics(mockSessionToken);

      expect(metrics.totalWorkflows).toBe(2);
      expect(metrics.activeWorkflows).toBe(1);
      expect(metrics.completedWorkflows).toBe(1);
      expect(metrics.averageCompletionTime).toBeGreaterThanOrEqual(0);
      expect(metrics.stepSuccessRate).toBeGreaterThanOrEqual(0);
      expect(metrics.qualityPassRate).toBeGreaterThanOrEqual(0);
    });
  });
});
