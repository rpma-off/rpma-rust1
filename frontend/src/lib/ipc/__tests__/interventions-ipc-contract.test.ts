import { interventionOperations } from '../domains/interventions';

jest.mock('../utils', () => ({
  safeInvoke: jest.fn(),
}));

jest.mock('../cache', () => ({
  cachedInvoke: jest.fn(),
  invalidatePattern: jest.fn(),
  getCacheStats: jest.fn(),
  invalidateKey: jest.fn(),
  clearCache: jest.fn(),
}));

jest.mock('@/lib/validation/backend-type-guards', () => ({
  validateIntervention: jest.fn((data) => data),
  validateInterventionStep: jest.fn((data) => data),
  validateStartInterventionResponse: jest.fn((data) => data),
}));

jest.mock('../core', () => ({
  extractAndValidate: jest.fn(),
  safeInvoke: jest.fn(),
  invalidatePattern: jest.fn(),
}));

const { safeInvoke } = jest.requireMock('../core') as {
  safeInvoke: jest.Mock;
};

const { cachedInvoke } = jest.requireMock('../cache') as {
  cachedInvoke: jest.Mock;
};

const { extractAndValidate } = jest.requireMock('../core') as {
  extractAndValidate: jest.Mock;
  safeInvoke: jest.Mock;
};

const { validateIntervention, validateInterventionStep, validateStartInterventionResponse } = jest.requireMock('@/lib/validation/backend-type-guards') as {
  validateIntervention: jest.Mock;
  validateInterventionStep: jest.Mock;
  validateStartInterventionResponse: jest.Mock;
};

describe('interventionOperations IPC contract tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    safeInvoke.mockImplementation(async (command: string, payload: Record<string, unknown>) => {
      if (command === 'intervention_get_latest_by_task') {
        return { id: 'intervention-latest', status: 'in_progress' };
      }

      const action = (payload?.action as { action?: string } | undefined)?.action;

      if (command === 'intervention_workflow') {
        switch (action) {
          case 'Start':
            return { type: 'Started', intervention: { id: 'intervention-123' }, steps: [] };
          case 'Get':
            return { type: 'Retrieved', intervention: { id: 'intervention-123', status: 'in_progress' } };
          case 'GetActiveByTask':
            return { type: 'ActiveByTask', interventions: [{ id: 'intervention-123', status: 'in_progress' }] };
          case 'Update':
            return { type: 'Updated', intervention: { id: 'intervention-123' } };
          case 'Finalize':
            return { type: 'Finalized', intervention: { id: 'intervention-123', status: 'completed' }, metrics: {} };
          default:
            return { type: 'Unknown' };
        }
      }

      if (command === 'intervention_progress') {
        switch (action) {
          case 'AdvanceStep':
            return { type: 'StepAdvanced', step: { id: 'step-1' }, next_step: null, progress_percentage: 25 };
          case 'GetStep':
            return { type: 'StepRetrieved', step: { id: 'step-1' } };
          case 'Get':
            return { type: 'Retrieved', progress: { completion_percentage: 50 }, steps: [] };
          case 'SaveStepProgress':
            return { type: 'StepProgressSaved', step: { id: 'step-1' } };
          default:
            return { type: 'Unknown' };
        }
      }

      if (command === 'intervention_management') {
        return { type: 'List', interventions: [], total: 0 };
      }

      return { type: 'Unknown' };
    });
    cachedInvoke.mockResolvedValue(null);
    
    extractAndValidate.mockImplementation((result, validator) => (validator ? validator(result) : result));
  });

  describe('Workflow Operations', () => {
    it('calls safeInvoke and extracts valid response for start operation', async () => {
      const startData = {
        task_id: 'task-123',
        workflow_type: 'ppf_installation',
        technician_id: 'tech-456',
        scheduled_date: '2025-02-15'
      };
      
      const mockResponse = {
        type: 'Started',
        intervention: { id: 'intervention-123' },
        steps: [{ id: 'step-1', name: 'Preparation' }]
      };

      safeInvoke.mockResolvedValue(mockResponse);
      extractAndValidate.mockReturnValue(validateStartInterventionResponse(mockResponse));

      await interventionOperations.start(startData);

      expect(safeInvoke).toHaveBeenCalledWith('intervention_workflow', {
        action: { action: 'Start', data: startData }
      });
      expect(validateStartInterventionResponse).toHaveBeenCalledWith(mockResponse);
    });

    it('throws error for invalid response format on start', async () => {
      const invalidResponse = { invalid: 'structure' };
      safeInvoke.mockResolvedValue(invalidResponse);

      try {
        await interventionOperations.start({});
      } catch (error) {
        expect(error.message).toBe('Invalid response format for intervention start');
      }
    });

    it('calls safeInvoke and extracts valid response for get operation', async () => {
      const mockResponse = {
        type: 'Retrieved',
        intervention: { id: 'intervention-123', status: 'in_progress' }
      };

      safeInvoke.mockResolvedValue(mockResponse);
      extractAndValidate.mockReturnValue(validateIntervention(mockResponse.intervention));

      await interventionOperations.get('intervention-123');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_workflow', {
        action: { action: 'Get', id: 'intervention-123' }
      });
      expect(validateIntervention).toHaveBeenCalledWith(mockResponse.intervention);
    });

    it('throws error for invalid response format on get', async () => {
      const invalidResponse = { type: 'UnexpectedType' };
      safeInvoke.mockResolvedValue(invalidResponse);

      try {
        await interventionOperations.get('intervention-123');
      } catch (error) {
        expect(error.message).toBe('Invalid response format for intervention get');
      }
    });

    it('handles getActiveByTask with expected response structure', async () => {
      const mockResponse = {
        type: 'ActiveByTask',
        interventions: [{ id: 'intervention-123', status: 'in_progress' }]
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await interventionOperations.getActiveByTask('task-123');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_workflow', {
        action: { action: 'GetActiveByTask', task_id: 'task-123' }
      });
      expect(result).toEqual({ intervention: mockResponse.interventions[0] });
    });

    it('handles getLatestByTask with API response structure', async () => {
      const mockResponse = { id: 'intervention-456', status: 'completed' };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await interventionOperations.getLatestByTask('task-123');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_get_latest_by_task', {
        taskId: 'task-123'
      });
      expect(result).toEqual({ intervention: mockResponse });
    });

    it('calls safeInvoke and extracts valid response for updateWorkflow', async () => {
      const updateData = { notes: 'Updated notes' };
      const mockResponse = {
        type: 'Updated',
        intervention: { id: 'intervention-123', notes: 'Updated notes' }
      };

      safeInvoke.mockResolvedValue(mockResponse);
      extractAndValidate.mockReturnValue(validateIntervention(mockResponse.intervention));

      await interventionOperations.updateWorkflow('intervention-123', updateData);

      expect(safeInvoke).toHaveBeenCalledWith('intervention_workflow', {
        action: { action: 'Update', id: 'intervention-123', data: updateData }
      });
      expect(validateIntervention).toHaveBeenCalledWith(mockResponse.intervention);
    });

    it('calls safeInvoke for finalize operation', async () => {
      const finalizeData = {
        end_time: '2025-02-15T14:00:00Z',
        quality_score: 4.8,
        completion_notes: 'Successfully completed'
      };
      
      const mockResponse = {
        type: 'Finalized',
        intervention: { id: 'intervention-123', status: 'completed' },
        metrics: { duration: 300, materials_used: 5 }
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await interventionOperations.finalize(finalizeData);

      expect(safeInvoke).toHaveBeenCalledWith('intervention_workflow', {
        action: { action: 'Finalize', data: finalizeData }
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Progress Management Operations', () => {
    it('calls safeInvoke and extracts valid response for advanceStep', async () => {
      const stepData = {
        intervention_id: 'intervention-123',
        step_id: 'step-1',
        collected_data: { temperature: 22 },
        notes: 'Step completed',
        photos: ['photo-1.jpg'],
        quality_check_passed: true,
        issues: []
      };
      
      const mockResponse = {
        type: 'StepAdvanced',
        step: { id: 'step-2', name: 'Next Step' },
        next_step: { id: 'step-3', name: 'Following Step' },
        progress_percentage: 25
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await interventionOperations.advanceStep(stepData);

      expect(safeInvoke).toHaveBeenCalledWith('intervention_progress', {
        action: {
          action: 'AdvanceStep',
          intervention_id: 'intervention-123',
          step_id: 'step-1',
          collected_data: { temperature: 22 },
          notes: 'Step completed',
          photos: ['photo-1.jpg'],
          quality_check_passed: true,
          issues: []
        }
      });
      expect(result).toEqual(mockResponse);
    });

    it('throws error for invalid response format on advanceStep', async () => {
      const invalidResponse = { type: 'UnexpectedType' };
      safeInvoke.mockResolvedValue(invalidResponse);

      try {
        await interventionOperations.advanceStep({});
      } catch (error) {
        expect(error.message).toBe('Invalid response format for advance step');
      }
    });

    it('calls safeInvoke and extracts valid response for getStep', async () => {
      const mockResponse = {
        type: 'StepRetrieved',
        step: { id: 'step-1', name: 'Preparation', status: 'completed' }
      };

      safeInvoke.mockResolvedValue(mockResponse);
      extractAndValidate.mockReturnValue(validateInterventionStep(mockResponse.step));

      await interventionOperations.getStep('step-1');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_progress', {
        action: { action: 'GetStep', step_id: 'step-1' }
      });
      expect(validateInterventionStep).toHaveBeenCalledWith(mockResponse.step);
    });

    it('throws error for invalid response format on getStep', async () => {
      const invalidResponse = { type: 'UnexpectedType' };
      safeInvoke.mockResolvedValue(invalidResponse);

      try {
        await interventionOperations.getStep('step-1');
      } catch (error) {
        expect(error.message).toBe('Invalid response format for get step');
      }
    });

    it('calls safeInvoke and processes getProgress response', async () => {
      const mockResponse = {
        type: 'Retrieved',
        progress: { completion_percentage: 65 },
        steps: [
          { id: 'step-1', status: 'completed' },
          { id: 'step-2', status: 'in_progress' }
        ]
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await interventionOperations.getProgress('intervention-123');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_progress', {
        action: { action: 'Get', intervention_id: 'intervention-123' }
      });
      expect(result).toEqual({
        steps: mockResponse.steps,
        progress_percentage: 65
      });
    });

    it('throws error for invalid response format on getProgress', async () => {
      const invalidResponse = { type: 'UnexpectedType' };
      safeInvoke.mockResolvedValue(invalidResponse);

      try {
        await interventionOperations.getProgress('intervention-123');
      } catch (error) {
        expect(error.message).toBe('Invalid response format for get progress');
      }
    });

    it('calls safeInvoke and extracts valid response for saveStepProgress', async () => {
      const stepProgressData = {
        step_id: 'step-1',
        collected_data: { temperature: 23 },
        notes: 'Progress saved',
        photos: ['photo-1.jpg']
      };
      
      const mockResponse = {
        type: 'StepProgressSaved',
        step: { id: 'step-1', progress_percentage: 75 }
      };

      safeInvoke.mockResolvedValue(mockResponse);
      extractAndValidate.mockReturnValue(validateInterventionStep(mockResponse.step));

      await interventionOperations.saveStepProgress(stepProgressData);

      expect(safeInvoke).toHaveBeenCalledWith('intervention_progress', {
        action: {
          action: 'SaveStepProgress',
          step_id: 'step-1',
          collected_data: { temperature: 23 },
          notes: 'Progress saved',
          photos: ['photo-1.jpg']
        }
      });
      expect(validateInterventionStep).toHaveBeenCalledWith(mockResponse.step);
    });

    it('throws error for invalid response format on saveStepProgress', async () => {
      const invalidResponse = { type: 'UnexpectedType' };
      safeInvoke.mockResolvedValue(invalidResponse);

      try {
        await interventionOperations.saveStepProgress({});
      } catch (error) {
        expect(error.message).toBe('Invalid response format for save step progress');
      }
    });
  });

  describe('Management Operations', () => {
    it('calls safeInvoke and processes list response', async () => {
      const filters = {
        status: 'in_progress',
        technician_id: 'tech-123',
        limit: 20,
        offset: 0
      };
      
      const mockResponse = {
        type: 'List',
        interventions: [
          { id: 'intervention-123', status: 'in_progress' },
          { id: 'intervention-456', status: 'in_progress' }
        ],
        total: 2,
        page: 1,
        limit: 20
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await interventionOperations.list(filters);

      expect(safeInvoke).toHaveBeenCalledWith('intervention_management', {
        action: { action: 'List', query: { status: 'in_progress', technician_id: 'tech-123', limit: 20, page: 1 } }
      });
      expect(result).toEqual({
        interventions: mockResponse.interventions,
        total: mockResponse.total
      });
    });

    it('throws error for invalid response format on list', async () => {
      const invalidResponse = { type: 'UnexpectedType' };
      safeInvoke.mockResolvedValue(invalidResponse);

      try {
        await interventionOperations.list({});
      } catch (error) {
        expect(error.message).toBe('Invalid response format for intervention list');
      }
    });

    it('sends correct action shape matching backend tagged enum', async () => {
      const mockResponse = {
        type: 'List',
        interventions: [],
        total: 0,
        page: 1,
        limit: 50
      };
      safeInvoke.mockResolvedValue(mockResponse);

      await interventionOperations.list({ status: 'active' }, 'token-abc');

      const callArgs = safeInvoke.mock.calls[0];
      expect(callArgs[0]).toBe('intervention_management');
      // Verify the action shape uses tagged enum format: { action: "List", query: {...} }
      // NOT the old format: { List: { filters: {...} } }
      expect(callArgs[1].action).toHaveProperty('action', 'List');
      expect(callArgs[1].action).toHaveProperty('query');
      expect(callArgs[1].action).not.toHaveProperty('List');
      // Verify session_token is at top level (not sessionToken)
      expect(callArgs[1]).toHaveProperty('session_token', 'token-abc');
    });
  });

  describe('Request Validation', () => {
    it('validates required fields for start operation', async () => {
      const invalidData = {
        // Missing required task_id
        technician_id: 'tech-123'
      };

      safeInvoke.mockResolvedValue({
        type: 'Started',
        intervention: { id: 'intervention-123' },
        steps: []
      });

      await interventionOperations.start(invalidData);

      expect(safeInvoke).toHaveBeenCalledWith('intervention_workflow', {
        action: { action: 'Start', data: invalidData }
      });
    });

    it('validates intervention ID format for get operation', async () => {
      await interventionOperations.get('');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_workflow', {
        action: { action: 'Get', id: '' }
      });
    });

    it('validates step data structure for advanceStep', async () => {
      const invalidStepData = {
        intervention_id: '',
        step_id: '',
        // Missing required fields
      };

      await interventionOperations.advanceStep(invalidStepData);

      expect(safeInvoke).toHaveBeenCalledWith('intervention_progress', {
        action: {
          action: 'AdvanceStep',
          intervention_id: '',
          step_id: '',
          collected_data: undefined,
          notes: undefined,
          photos: undefined,
          quality_check_passed: undefined,
          issues: undefined
        }
      });
    });

    it('validates filters structure for list operation', async () => {
      const invalidFilters = {
        status: 'invalid_status',
        limit: -1,
        offset: -1
      };

      await interventionOperations.list(invalidFilters);

      expect(safeInvoke).toHaveBeenCalledWith('intervention_management', {
        action: { action: 'List', query: { status: 'invalid_status', limit: -1, page: 2 } }
      });
    });
  });

  describe('Response Shape Validation', () => {
    it('validates complete response structure for start', async () => {
      const mockResponse = {
        type: 'Started',
        intervention: {
          id: 'intervention-123',
          task_id: 'task-123',
          status: 'in_progress',
          technician_id: 'tech-123',
          created_at: '2025-02-09T10:00:00Z'
        },
        steps: [
          {
            id: 'step-1',
            name: 'Preparation',
            status: 'pending',
            order: 1
          }
        ]
      };

      safeInvoke.mockResolvedValue(mockResponse);
      extractAndValidate.mockReturnValue(validateStartInterventionResponse(mockResponse));

      const result = await interventionOperations.start({
        task_id: 'task-123',
        technician_id: 'tech-123'
      });

      expect(validateStartInterventionResponse).toHaveBeenCalledWith(mockResponse);
      expect(result).toEqual(validateStartInterventionResponse(mockResponse));
    });

    it('validates progress response structure', async () => {
      const mockResponse = {
        type: 'Retrieved',
        progress: {
          intervention_id: 'intervention-123',
          completion_percentage: 65,
          current_step_id: 'step-2',
          status: 'in_progress'
        },
        steps: [
          {
            id: 'step-1',
            name: 'Preparation',
            status: 'completed',
            duration_minutes: 30,
            completed_at: '2025-02-09T10:30:00Z'
          },
          {
            id: 'step-2',
            name: 'Application',
            status: 'in_progress',
            started_at: '2025-02-09T11:00:00Z'
          }
        ]
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await interventionOperations.getProgress('intervention-123');

      expect(result).toEqual({
        steps: mockResponse.steps,
        progress_percentage: 65
      });
    });

    it('validates empty interventions list for getActiveByTask', async () => {
      const mockResponse = {
        type: 'ActiveByTask',
        interventions: []
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await interventionOperations.getActiveByTask('task-123');

      expect(result).toEqual({ intervention: null });
    });

    it('validates null response for getLatestByTask', async () => {
      const mockResponse = {
        data: null
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await interventionOperations.getLatestByTask('task-123');

      expect(result).toEqual({ intervention: null });
    });
  });

  describe('Authentication and Authorization', () => {
    it('requires session token for all operations', async () => {
      const operations = [
        () => interventionOperations.start({}, ''),
        () => interventionOperations.get('intervention-123', ''),
        () => interventionOperations.advanceStep({}, ''),
        () => interventionOperations.getProgress('intervention-123', ''),
        () => interventionOperations.list({}, ''),
      ];

      for (const operation of operations) {
        try {
          await operation();
        } catch (_error) {
          // Expected to fail due to empty session token
        }
      }

      expect(safeInvoke).toHaveBeenCalledTimes(operations.length);
    });

    it('passes session token correctly in all requests', async () => {
      const sessionToken = 'valid-session-token';
      
      await interventionOperations.start({ task_id: 'task-123' }, sessionToken);
      await interventionOperations.get('intervention-123', sessionToken);
      await interventionOperations.advanceStep({
        intervention_id: 'intervention-123',
        step_id: 'step-1'
      }, sessionToken);

      expect(safeInvoke).toHaveBeenCalledWith('intervention_workflow', {
        action: { action: 'Start', data: { task_id: 'task-123' } },
        sessionToken: sessionToken
      });

      expect(safeInvoke).toHaveBeenCalledWith('intervention_workflow', {
        action: { action: 'Get', id: 'intervention-123' },
        sessionToken: sessionToken
      });

      expect(safeInvoke).toHaveBeenCalledWith('intervention_progress', {
        action: {
          action: 'AdvanceStep',
          intervention_id: 'intervention-123',
          step_id: 'step-1',
          collected_data: undefined,
          notes: undefined,
          photos: undefined,
          quality_check_passed: undefined,
          issues: undefined
        },
        sessionToken: sessionToken
      });
    });
  });

  describe('Error Response Handling', () => {
    it('handles validation errors from backend for start', async () => {
      const errorResponse = {
        type: 'ValidationError',
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid intervention data',
          details: {
            field: 'task_id',
            issue: 'required field missing'
          }
        }
      };

      safeInvoke.mockRejectedValue(errorResponse);

      try {
        await interventionOperations.start({});
      } catch (error) {
        expect(error).toEqual(errorResponse);
      }
    });

    it('handles not found errors for get operation', async () => {
      const notFoundResponse = {
        type: 'NotFound',
        error: {
          code: 'NOT_FOUND',
          message: 'Intervention not found'
        }
      };

      safeInvoke.mockResolvedValue(notFoundResponse);

      try {
        await interventionOperations.get('nonexistent-intervention');
      } catch (error) {
        expect(error.message).toBe('Invalid response format for intervention get');
      }
    });

    it('handles workflow errors for advanceStep', async () => {
      const workflowError = {
        type: 'WorkflowError',
        error: {
          code: 'WORKFLOW_ERROR',
          message: 'Cannot advance step - previous step not completed',
          details: {
            current_step_id: 'step-2',
            previous_step_id: 'step-1',
            previous_step_status: 'pending'
          }
        }
      };

      safeInvoke.mockRejectedValue(workflowError);

      try {
        await interventionOperations.advanceStep({
          intervention_id: 'intervention-123',
          step_id: 'step-2'
        });
      } catch (error) {
        expect(error).toEqual(workflowError);
      }
    });

    it('handles permission errors', async () => {
      const permissionError = {
        type: 'PermissionError',
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Insufficient permissions to access this intervention'
        }
      };

      safeInvoke.mockRejectedValue(permissionError);

      try {
        await interventionOperations.get('intervention-123', 'unauthorized-token');
      } catch (error) {
        expect(error).toEqual(permissionError);
      }
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('handles extremely long notes in start operation', async () => {
      const longNotes = 'a'.repeat(10000);
      const startData = {
        task_id: 'task-123',
        notes: longNotes
      };

      await interventionOperations.start(startData);

      expect(safeInvoke).toHaveBeenCalledWith('intervention_workflow', {
        action: { action: 'Start', data: startData }
      });
    });

    it('handles special characters in step notes', async () => {
      const specialNotes = 'Step with special chars: éàüß@#$%^&*()';
      const stepData = {
        intervention_id: 'intervention-123',
        step_id: 'step-1',
        notes: specialNotes
      };

      await interventionOperations.advanceStep(stepData);

      expect(safeInvoke).toHaveBeenCalledWith('intervention_progress', {
        action: {
          action: 'AdvanceStep',
          intervention_id: 'intervention-123',
          step_id: 'step-1',
          collected_data: undefined,
          notes: specialNotes,
          photos: undefined,
          quality_check_passed: undefined,
          issues: undefined
        }
      });
    });

    it('handles empty photos array', async () => {
      const stepData = {
        intervention_id: 'intervention-123',
        step_id: 'step-1',
        photos: []
      };

      await interventionOperations.advanceStep(stepData);

      expect(safeInvoke).toHaveBeenCalledWith('intervention_progress', {
        action: {
          action: 'AdvanceStep',
          intervention_id: 'intervention-123',
          step_id: 'step-1',
          collected_data: undefined,
          notes: undefined,
          photos: [],
          quality_check_passed: undefined,
          issues: undefined
        }
      });
    });

    it('handles null values in optional fields', async () => {
      const updateData = {
        notes: null,
        technician_id: null,
        scheduled_date: null
      };

      await interventionOperations.updateWorkflow('intervention-123', updateData);

      expect(safeInvoke).toHaveBeenCalledWith('intervention_workflow', {
        action: { action: 'Update', id: 'intervention-123', data: updateData }
      });
    });

    it('handles maximum progress percentage', async () => {
      const stepProgressData = {
        intervention_id: 'intervention-123',
        step_id: 'step-1',
        progress_percentage: 100
      };

      await interventionOperations.saveStepProgress(stepProgressData);

      expect(safeInvoke).toHaveBeenCalledWith('intervention_progress', {
        action: {
          action: 'SaveStepProgress',
          step_id: 'step-1',
          collected_data: undefined,
          notes: undefined,
          photos: undefined
        }
      });
    });
  });
});
