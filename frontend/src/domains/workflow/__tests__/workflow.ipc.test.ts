import { workflowIpc } from '../ipc/workflow.ipc';

jest.mock('@/lib/ipc/core', () => ({
  safeInvoke: jest.fn(),
}));

jest.mock('../ipc', () => ({
  interventionsIpc: {
    start: jest.fn(),
    getProgress: jest.fn(),
    advanceStep: jest.fn(),
    get: jest.fn(),
    saveStepProgress: jest.fn(),
    finalize: jest.fn(),
    getActiveByTask: jest.fn(),
    getLatestByTask: jest.fn(),
    getStep: jest.fn(),
    list: jest.fn(),
    updateWorkflow: jest.fn(),
  },
}));

const { interventionsIpc: mockWorkflowIpc } = jest.requireMock('../ipc') as {
  interventionsIpc: {
    start: jest.Mock;
    getProgress: jest.Mock;
    advanceStep: jest.Mock;
    get: jest.Mock;
    saveStepProgress: jest.Mock;
    finalize: jest.Mock;
    getActiveByTask: jest.Mock;
    getLatestByTask: jest.Mock;
    getStep: jest.Mock;
    list: jest.Mock;
    updateWorkflow: jest.Mock;
  };
};

describe('workflowIpc', () => {
  const mockSessionToken = 'test-session-token';
  const mockIntervention = {
    id: 'intervention-1',
    task_id: 'task-1',
    status: 'in_progress',
    steps: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const mockStep = {
    id: 'step-1',
    intervention_id: 'intervention-1',
    step_name: 'Preparation',
    status: 'in_progress',
    quality_check_passed: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startWorkflow', () => {
    it('should call interventionsIpc.start with correct parameters', async () => {
      const options = {
        taskId: 'task-1',
        vehicle_model: 'BMW X5',
        ppf_zones: ['hood', 'roof'],
      };
      const mockResponse = {
        intervention: mockIntervention,
        steps: [mockStep],
      };
      interventionsIpc.start.mockResolvedValue(mockResponse);

      const result = await workflowIpc.startWorkflow(options, mockSessionToken);

      expect(interventionsIpc.start).toHaveBeenCalledWith(
        {
          task_id: 'task-1',
          intervention_type: 'ppf_application',
          vehicle_model: 'BMW X5',
          ppf_zones: ['hood', 'roof'],
        },
        mockSessionToken
      );
      expect(result.intervention).toEqual(mockIntervention);
      expect(result.steps).toEqual([mockStep]);
      expect(result.message).toBe('Workflow started successfully');
    });
  });

  describe('getWorkflowProgress', () => {
    it('should call interventionsIpc.getProgress and return progress data', async () => {
      const mockProgress = {
        steps: [
          { ...mockStep, status: 'completed' },
          { ...mockStep, status: 'in_progress' },
        ],
        progress_percentage: 75,
      };
      interventionsIpc.getProgress.mockResolvedValue(mockProgress);

      const result = await workflowIpc.getWorkflowProgress('intervention-1', mockSessionToken);

      expect(interventionsIpc.getProgress).toHaveBeenCalledWith('intervention-1', mockSessionToken);
      expect(result.progressPercentage).toBe(75);
      expect(result.completedSteps).toBe(1);
      expect(result.totalSteps).toBe(2);
      expect(result.currentStep).toMatchObject({ status: 'in_progress' });
    });

    it('should handle empty steps', async () => {
      const mockProgress = {
        steps: [],
        progress_percentage: 0,
      };
      interventionsIpc.getProgress.mockResolvedValue(mockProgress);

      const result = await workflowIpc.getWorkflowProgress('intervention-1', mockSessionToken);

      expect(result.progressPercentage).toBe(0);
      expect(result.completedSteps).toBe(0);
      expect(result.totalSteps).toBe(0);
      expect(result.currentStep).toBeNull();
    });
  });

  describe('advanceWorkflowStep', () => {
    it('should call interventionsIpc.advanceStep with correct parameters', async () => {
      const stepData = {
        interventionId: 'intervention-1',
        stepId: 'step-1',
        collected_data: {},
        notes: 'Step completed',
        photos: [],
        quality_check_passed: true,
        issues: [],
      };
      const mockResponse = {
        step: { ...mockStep, status: 'completed' },
        next_step: { ...mockStep, step_name: 'Application' },
        progress_percentage: 50,
      };
      interventionsIpc.advanceStep.mockResolvedValue(mockResponse);

      const result = await workflowIpc.advanceWorkflowStep(stepData, mockSessionToken);

      expect(interventionsIpc.advanceStep).toHaveBeenCalledWith(
        {
          intervention_id: 'intervention-1',
          step_id: 'step-1',
          collected_data: {},
          notes: 'Step completed',
          photos: [],
          quality_check_passed: true,
          issues: [],
        },
        mockSessionToken
      );
      expect(result.progressPercentage).toBe(50);
      expect(result.nextStep).toBeTruthy();
    });
  });

  describe('getWorkflowDetails', () => {
    it('should call interventionsIpc.get and return workflow details', async () => {
      const mockResponse = {
        intervention: {
          ...mockIntervention,
          steps: [mockStep],
        },
      };
      interventionsIpc.get.mockResolvedValue(mockResponse);

      const result = await workflowIpc.getWorkflowDetails('intervention-1', mockSessionToken);

      expect(interventionsIpc.get).toHaveBeenCalledWith('intervention-1', mockSessionToken);
      expect(result.intervention).toEqual(mockResponse.intervention);
      expect(result.currentStep).toEqual(mockStep);
      expect(result.isCompleted).toBe(false);
      expect(result.canFinalize).toBe(true);
    });
  });

  describe('finalizeWorkflow', () => {
    it('should call interventionsIpc.finalize and return metrics', async () => {
      const finalizeData = {
        interventionId: 'intervention-1',
        final_notes: 'All steps completed',
      };
      const mockResponse = {
        intervention: { ...mockIntervention, status: 'completed' },
        metrics: {
          total_time_minutes: 120,
          quality_score: 95,
        },
      };
      interventionsIpc.finalize.mockResolvedValue(mockResponse);

      const result = await workflowIpc.finalizeWorkflow(finalizeData, mockSessionToken);

      expect(interventionsIpc.finalize).toHaveBeenCalledWith(
        {
          intervention_id: 'intervention-1',
          final_notes: 'All steps completed',
        },
        mockSessionToken
      );
      expect(result.intervention).toEqual(mockResponse.intervention);
      expect(result.metrics).toEqual(mockResponse.metrics);
      expect(result.message).toBe('Workflow finalized successfully');
    });
  });

  describe('getWorkflowForTask', () => {
    it('should return active workflow for task', async () => {
      const mockResponse = {
        intervention: mockIntervention,
      };
      interventionsIpc.getActiveByTask.mockResolvedValue(mockResponse);

      const result = await workflowIpc.getWorkflowForTask('task-1', mockSessionToken);

      expect(interventionsIpc.getActiveByTask).toHaveBeenCalledWith('task-1', mockSessionToken);
      expect(result.intervention).toEqual(mockIntervention);
      expect(result.isActive).toBe(true);
    });

    it('should return null when no active workflow exists', async () => {
      const mockResponse = {
        intervention: null,
      };
      interventionsIpc.getActiveByTask.mockResolvedValue(mockResponse);

      const result = await workflowIpc.getWorkflowForTask('task-1', mockSessionToken);

      expect(result.intervention).toBeNull();
      expect(result.isActive).toBe(false);
    });
  });

  describe('listActiveWorkflows', () => {
    it('should list active workflows for technician', async () => {
      const mockResponse = {
        interventions: [mockIntervention],
        total: 1,
      };
      interventionsIpc.list.mockResolvedValue(mockResponse);

      const result = await workflowIpc.listActiveWorkflows(
        { technician_id: 'tech-1', limit: 10 },
        mockSessionToken
      );

      expect(interventionsIpc.list).toHaveBeenCalledWith(
        {
          status: 'in_progress',
          technician_id: 'tech-1',
          limit: 10,
        },
        mockSessionToken
      );
      expect(result.workflows).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
