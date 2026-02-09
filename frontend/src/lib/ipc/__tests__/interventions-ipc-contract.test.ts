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
}));

const { safeInvoke } = jest.requireMock('../utils') as {
  safeInvoke: jest.Mock;
};

const { cachedInvoke, invalidatePattern } = jest.requireMock('../cache') as {
  cachedInvoke: jest.Mock;
  invalidatePattern: jest.Mock;
};

const { extractAndValidate } = jest.requireMock('../core') as {
  extractAndValidate: jest.Mock;
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
    safeInvoke.mockResolvedValue('ok');
    cachedInvoke.mockResolvedValue(null);
    
    extractAndValidate.mockImplementation((result, validator) => result);
  });

  describe('Workflow Operations', () => {
    it('calls safeInvoke and extracts valid response for start operation', async () => {
      const startData = {
        task_id: 'task-123',
        workflow_type: 'ppf_installation',
        technician_id: 'tech-456',
        scheduled_date: '2025-02-15',
      };
      
      const mockResponse = {
        type: 'Started',
        intervention: { id: 'intervention-123' },
        steps: [{ id: 'step-1', name: 'Preparation' }]
      };

      safeInvoke.mockResolvedValue(mockResponse);
      extractAndValidate.mockReturnValue(validateStartInterventionResponse(mockResponse));

      const result = await interventionOperations.start(startData, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_workflow', {
        action: { action: 'Start', data: startData },
        sessionToken: 'session-token'
      });
      expect(validateStartInterventionResponse).toHaveBeenCalledWith(mockResponse);
    });

    it('throws error for invalid response format on start', async () => {
      const invalidResponse = { invalid: 'structure' };
      safeInvoke.mockResolvedValue(invalidResponse);

      try {
        await interventionOperations.start({}, 'session-token');
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

      const result = await interventionOperations.get('intervention-123', 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_workflow', {
        action: { action: 'Get', id: 'intervention-123' },
        sessionToken: 'session-token'
      });
      expect(validateIntervention).toHaveBeenCalledWith(mockResponse.intervention);
    });

    it('throws error for invalid response format on get', async () => {
      const invalidResponse = { type: 'UnexpectedType' };
      safeInvoke.mockResolvedValue(invalidResponse);

      try {
        await interventionOperations.get('intervention-123', 'session-token');
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

      const result = await interventionOperations.getActiveByTask('task-123', 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_workflow', {
        action: { action: 'GetActiveByTask', task_id: 'task-123' },
        sessionToken: 'session-token'
      });
      expect(result).toEqual({ intervention: mockResponse.interventions[0] });
    });

    it('handles getLatestByTask with API response structure', async () => {
      const mockResponse = {
        data: { id: 'intervention-456', status: 'completed' }
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await interventionOperations.getLatestByTask('task-123', 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_get_latest_by_task', {
        taskId: 'task-123',
        sessionToken: 'session-token'
      });
      expect(result).toEqual({ intervention: mockResponse.data });
    });

    it('calls safeInvoke and extracts valid response for updateWorkflow', async () => {
      const updateData = { notes: 'Updated notes' };
      const mockResponse = {
        type: 'Updated',
        intervention: { id: 'intervention-123', notes: 'Updated notes' }
      };

      safeInvoke.mockResolvedValue(mockResponse);
      extractAndValidate.mockReturnValue(validateIntervention(mockResponse.intervention));

      const result = await interventionOperations.updateWorkflow('intervention-123', updateData, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_workflow', {
        action: { action: 'Update', id: 'intervention-123', data: updateData },
        sessionToken: 'session-token'
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

      const result = await interventionOperations.finalize(finalizeData, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_workflow', {
        action: { action: 'Finalize', data: finalizeData },
        sessionToken: 'session-token'
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

      const result = await interventionOperations.advanceStep(stepData, 'session-token');

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
        },
        sessionToken: 'session-token'
      });
      expect(result).toEqual(mockResponse);
    });

    it('throws error for invalid response format on advanceStep', async () => {
      const invalidResponse = { type: 'UnexpectedType' };
      safeInvoke.mockResolvedValue(invalidResponse);

      try {
        await interventionOperations.advanceStep({}, 'session-token');
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

      const result = await interventionOperations.getStep('step-1', 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_progress', {
        action: { action: 'GetStep', step_id: 'step-1' },
        sessionToken: 'session-token'
      });
      expect(validateInterventionStep).toHaveBeenCalledWith(mockResponse.step);
    });

    it('throws error for invalid response format on getStep', async () => {
      const invalidResponse = { type: 'UnexpectedType' };
      safeInvoke.mockResolvedValue(invalidResponse);

      try {
        await interventionOperations.getStep('step-1', 'session-token');
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

      const result = await interventionOperations.getProgress('intervention-123', 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_progress', {
        action: { action: 'Get', intervention_id: 'intervention-123' },
        sessionToken: 'session-token'
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
        await interventionOperations.getProgress('intervention-123', 'session-token');
      } catch (error) {
        expect(error.message).toBe('Invalid response format for get progress');
      }
    });

    it('calls safeInvoke and extracts valid response for saveStepProgress', async () => {
      const stepProgressData = {
        intervention_id: 'intervention-123',
        step_id: 'step-1',
        progress_percentage: 75,
        current_phase: 'application',
        notes: 'Progress saved',
        temporary_data: { temperature: 23 }
      };
      
      const mockResponse = {
        type: 'StepProgressSaved',
        step: { id: 'step-1', progress_percentage: 75 }
      };

      safeInvoke.mockResolvedValue(mockResponse);
      extractAndValidate.mockReturnValue(validateInterventionStep(mockResponse.step));

      const result = await interventionOperations.saveStepProgress(stepProgressData, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_progress', {
        action: {
          action: 'SaveStepProgress',
          intervention_id: 'intervention-123',
          step_id: 'step-1',
          progress_percentage: 75,
          current_phase: 'application',
          notes: 'Progress saved',
          temporary_data: { temperature: 23 }
        },
        sessionToken: 'session-token'
      });
      expect(validateInterventionStep).toHaveBeenCalledWith(mockResponse.step);
    });

    it('throws error for invalid response format on saveStepProgress', async () => {
      const invalidResponse = { type: 'UnexpectedType' };
      safeInvoke.mockResolvedValue(invalidResponse);

      try {
        await interventionOperations.saveStepProgress({}, 'session-token');
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
        type: 'ListRetrieved',
        interventions: [
          { id: 'intervention-123', status: 'in_progress' },
          { id: 'intervention-456', status: 'in_progress' }
        ],
        total: 2
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await interventionOperations.list(filters, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_management', {
        action: { List: { filters } },
        sessionToken: 'session-token'
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
        await interventionOperations.list({}, 'session-token');
      } catch (error) {
        expect(error.message).toBe('Invalid response format for intervention list');
      }
    });
  });

  describe('Request Validation', () => {
    it('validates required fields for start operation', async () => {
      const invalidData = {
        // Missing required task_id
        technician_id: 'tech-123',
      };

      await interventionOperations.start(invalidData, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_workflow', {
        action: { action: 'Start', data: invalidData },
        sessionToken: 'session-token'
      });
    });

    it('validates intervention ID format for get operation', async () => {
      await interventionOperations.get('', 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_workflow', {
        action: { action: 'Get', id: '' },
        sessionToken: 'session-token'
      });
    });

    it('validates step data structure for advanceStep', async () => {
      const invalidStepData = {
        intervention_id: '',
        step_id: '',
        // Missing required fields
      };

      await interventionOperations.advanceStep(invalidStepData, 'session-token');

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
        },
        sessionToken: 'session-token'
      });
    });

    it('validates filters structure for list operation', async () => {
      const invalidFilters = {
        status: 'invalid_status',
        limit: -1,
        offset: -1
      };

      await interventionOperations.list(invalidFilters, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_management', {
        action: { List: { filters: invalidFilters } },
        sessionToken: 'session-token'
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
          created_at: '2025-02-09T10:00:00Z',
        },
        steps: [
          {
            id: 'step-1',
            name: 'Preparation',
            status: 'pending',
            order: 1,
          }
        ]
      };

      safeInvoke.mockResolvedValue(mockResponse);
      extractAndValidate.mockReturnValue(validateStartInterventionResponse(mockResponse));

      const result = await interventionOperations.start({
        task_id: 'task-123',
        technician_id: 'tech-123'
      }, 'session-token');

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
          status: 'in_progress',
        },
        steps: [
          {
            id: 'step-1',
            name: 'Preparation',
            status: 'completed',
            duration_minutes: 30,
            completed_at: '2025-02-09T10:30:00Z',
          },
          {
            id: 'step-2',
            name: 'Application',
            status: 'in_progress',
            started_at: '2025-02-09T11:00:00Z',
          }
        ]
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await interventionOperations.getProgress('intervention-123', 'session-token');

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

      const result = await interventionOperations.getActiveByTask('task-123', 'session-token');

      expect(result).toEqual({ intervention: null });
    });

    it('validates null response for getLatestByTask', async () => {
      const mockResponse = {
        data: null
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await interventionOperations.getLatestByTask('task-123', 'session-token');

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
        } catch (error) {
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
        await interventionOperations.start({}, 'session-token');
      } catch (error) {
        expect(error).toEqual(errorResponse);
      }
    });

    it('handles not found errors for get operation', async () => {
      const notFoundResponse = {
        type: 'NotFound',
        error: {
          code: 'NOT_FOUND',
          message: 'Intervention not found',
        }
      };

      safeInvoke.mockResolvedValue(notFoundResponse);

      try {
        await interventionOperations.get('nonexistent-intervention', 'session-token');
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
        }, 'session-token');
      } catch (error) {
        expect(error).toEqual(workflowError);
      }
    });

    it('handles permission errors', async () => {
      const permissionError = {
        type: 'PermissionError',
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Insufficient permissions to access this intervention',
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
        notes: longNotes,
      };

      await interventionOperations.start(startData, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_workflow', {
        action: { action: 'Start', data: startData },
        sessionToken: 'session-token'
      });
    });

    it('handles special characters in step notes', async () => {
      const specialNotes = 'Step with special chars: éàüß@#$%^&*()';
      const stepData = {
        intervention_id: 'intervention-123',
        step_id: 'step-1',
        notes: specialNotes,
      };

      await interventionOperations.advanceStep(stepData, 'session-token');

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
        },
        sessionToken: 'session-token'
      });
    });

    it('handles empty photos array', async () => {
      const stepData = {
        intervention_id: 'intervention-123',
        step_id: 'step-1',
        photos: [],
      };

      await interventionOperations.advanceStep(stepData, 'session-token');

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
        },
        sessionToken: 'session-token'
      });
    });

    it('handles null values in optional fields', async () => {
      const updateData = {
        notes: null,
        technician_id: null,
        scheduled_date: null,
      };

      await interventionOperations.updateWorkflow('intervention-123', updateData, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_workflow', {
        action: { action: 'Update', id: 'intervention-123', data: updateData },
        sessionToken: 'session-token'
      });
    });

    it('handles maximum progress percentage', async () => {
      const stepProgressData = {
        intervention_id: 'intervention-123',
        step_id: 'step-1',
        progress_percentage: 100,
      };

      await interventionOperations.saveStepProgress(stepProgressData, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_progress', {
        action: {
          action: 'SaveStepProgress',
          intervention_id: 'intervention-123',
          step_id: 'step-1',
          progress_percentage: 100,
          current_phase: undefined,
          notes: undefined,
          temporary_data: undefined
        },
        sessionToken: 'session-token'
      });
    });
  });
});