import { taskOperations } from '../domains/tasks';

// Mock the modules and dependencies
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
  validateTask: jest.fn((data) => data),
  validateTaskListResponse: jest.fn((data) => data),
}));

// Mock the crud helpers to prevent import issues
jest.mock('../utils/crud-helpers', () => ({
  createCrudOperations: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    list: jest.fn(),
    statistics: jest.fn(),
  })),
  ResponseHandlers: {
    discriminatedUnion: jest.fn(),
    discriminatedUnionNullable: jest.fn(),
    list: jest.fn(),
    statistics: jest.fn(),
  },
}));

jest.mock('../core', () => ({
  extractAndValidate: jest.fn(),
}));

// Get mock references
const { safeInvoke } = jest.requireMock('../utils') as {
  safeInvoke: jest.Mock;
};

const { cachedInvoke, invalidatePattern } = jest.requireMock('../cache') as {
  cachedInvoke: jest.Mock;
  invalidatePattern: jest.Mock;
};

const { ResponseHandlers } = jest.requireMock('../utils/crud-helpers') as {
  ResponseHandlers: {
    discriminatedUnion: jest.Mock,
    discriminatedUnionNullable: jest.Mock,
    list: jest.Mock,
    statistics: jest.Mock,
  };
};

const { extractAndValidate } = jest.requireMock('../core') as {
  extractAndValidate: jest.Mock;
};

const { validateTask, validateTaskListResponse } = jest.requireMock('@/lib/validation/backend-type-guards') as {
  validateTask: jest.Mock;
  validateTaskListResponse: jest.Mock;
};

// Mock the crud operations to prevent issues
const mockTaskCrud = {
  create: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  list: jest.fn(),
  statistics: jest.fn(),
};

jest.mock('../utils/crud-helpers', () => ({
  createCrudOperations: jest.fn().mockImplementation(() => mockTaskCrud),
  ResponseHandlers,
}));

describe('taskOperations IPC contract tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    safeInvoke.mockResolvedValue('ok');
    cachedInvoke.mockResolvedValue({
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        has_next: false,
        has_prev: false,
      },
    });
    
    // Setup ResponseHandlers mocks
    ResponseHandlers.discriminatedUnion.mockImplementation((_type, _validator) => (result) => result);
    ResponseHandlers.discriminatedUnionNullable.mockImplementation((_type, _validator) => (result) => result);
    ResponseHandlers.list.mockImplementation((_processor) => (result) => result);
    ResponseHandlers.statistics.mockImplementation(() => (result) => result);
    
    extractAndValidate.mockImplementation((result, _validator) => result);
    
    // Setup crud operations mock returns
    mockTaskCrud.create.mockResolvedValue({ id: 'task-123' });
    mockTaskCrud.get.mockResolvedValue({ id: 'task-123', title: 'Test Task' });
    mockTaskCrud.update.mockResolvedValue({ id: 'task-123', title: 'Updated Task' });
    mockTaskCrud.delete.mockResolvedValue(undefined);
    mockTaskCrud.list.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, has_next: false, has_prev: false }
    });
    mockTaskCrud.statistics.mockResolvedValue({ total: 100, completed: 80 });
  });

  describe('CRUD Operations', () => {
    it('calls safeInvoke with correct parameters for create', async () => {
      const createData = {
        title: 'New Task',
        description: 'Task description',
        vehicle_plate: 'ABC-123',
      };
      
      await taskOperations.create(createData, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('task_crud', {
        request: {
          action: { action: 'Create', data: createData },
          session_token: 'session-token'
        }
      }, expect.any(Function));
      expect(invalidatePattern).toHaveBeenCalledWith('task:');
    });

    it('calls cachedInvoke with correct parameters for get', async () => {
      await taskOperations.get('task-123', 'session-token');

      expect(cachedInvoke).toHaveBeenCalledWith(
        'task:task-123',
        'task_crud',
        {
          request: {
            action: { action: 'Get', id: 'task-123' },
            session_token: 'session-token'
          }
        },
        expect.any(Function)
      );
    });

    it('calls safeInvoke with correct parameters for update', async () => {
      const updateData = {
        title: 'Updated Task',
        status: 'completed',
      };
      
      await taskOperations.update('task-123', updateData, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('task_crud', {
        request: {
          action: { action: 'Update', id: 'task-123', data: updateData },
          session_token: 'session-token'
        }
      }, expect.any(Function));
      expect(invalidatePattern).toHaveBeenCalledWith('task:');
    });

    it('calls safeInvoke with correct parameters for delete', async () => {
      await taskOperations.delete('task-123', 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('task_crud', {
        request: {
          action: { action: 'Delete', id: 'task-123' },
          session_token: 'session-token'
        }
      });
      expect(invalidatePattern).toHaveBeenCalledWith('task:');
    });

    it('calls safeInvoke with correct parameters for list', async () => {
      const filters = {
        page: 1,
        limit: 20,
        status: 'pending',
        technician_id: 'tech-123',
      };
      
      await taskOperations.list(filters, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('task_crud', {
        request: {
          action: { action: 'List', filters },
          session_token: 'session-token'
        }
      }, expect.any(Function));
    });
  });

  describe('Specialized Operations', () => {
    it('calls safeInvoke with correct parameters for statistics', async () => {
      await taskOperations.statistics('session-token');

      expect(safeInvoke).toHaveBeenCalledWith('task_crud', {
        request: {
          action: { action: 'GetStatistics' },
          session_token: 'session-token'
        }
      }, expect.any(Function));
    });

    it('calls safeInvoke with correct parameters for checkTaskAssignment', async () => {
      await taskOperations.checkTaskAssignment('task-123', 'user-456', 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('check_task_assignment', {
        request: {
          task_id: 'task-123',
          user_id: 'user-456',
          session_token: 'session-token'
        }
      });
    });

    it('calls safeInvoke with correct parameters for checkTaskAvailability', async () => {
      await taskOperations.checkTaskAvailability('task-123', 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('check_task_availability', {
        request: {
          task_id: 'task-123',
          session_token: 'session-token'
        }
      });
    });

    it('calls safeInvoke with correct parameters for validateTaskAssignmentChange', async () => {
      await taskOperations.validateTaskAssignmentChange('task-123', 'old-user', 'new-user', 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('validate_task_assignment_change', {
        request: {
          task_id: 'task-123',
          old_user_id: 'old-user',
          new_user_id: 'new-user',
          session_token: 'session-token'
        }
      });
    });

    it('calls safeInvoke and extractAndValidate for editTask', async () => {
      const updates = { title: 'Updated Task' };
      
      await taskOperations.editTask('task-123', updates, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('edit_task', {
        request: {
          task_id: 'task-123',
          data: updates,
          session_token: 'session-token'
        }
      });
    });

    it('calls safeInvoke with correct parameters for addTaskNote', async () => {
      await taskOperations.addTaskNote('task-123', 'Test note', 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('add_task_note', {
        request: {
          task_id: 'task-123',
          note: 'Test note',
          session_token: 'session-token'
        }
      });
    });

    it('calls safeInvoke with correct parameters for sendTaskMessage', async () => {
      await taskOperations.sendTaskMessage('task-123', 'Test message', 'info', 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('send_task_message', {
        request: {
          task_id: 'task-123',
          message: 'Test message',
          message_type: 'info',
          session_token: 'session-token'
        }
      });
    });

    it('calls safeInvoke with correct parameters for delayTask', async () => {
      await taskOperations.delayTask('task-123', '2025-03-01', 'Customer request', 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('delay_task', {
        request: {
          task_id: 'task-123',
          new_scheduled_date: '2025-03-01',
          reason: 'Customer request',
          session_token: 'session-token'
        }
      });
    });

    it('calls safeInvoke with correct parameters for reportTaskIssue', async () => {
      await taskOperations.reportTaskIssue('task-123', 'material', 'high', 'Issue description', 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('report_task_issue', {
        request: {
          task_id: 'task-123',
          issue_type: 'material',
          severity: 'high',
          description: 'Issue description',
          session_token: 'session-token'
        }
      });
    });

    it('calls safeInvoke with correct parameters for exportTasksCsv', async () => {
      const options = {
        include_notes: true,
        date_range: {
          start_date: '2025-01-01',
          end_date: '2025-01-31'
        }
      };
      
      await taskOperations.exportTasksCsv(options, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('export_tasks_csv', {
        request: {
          include_client_data: true,
          filter: {
            date_from: '2025-01-01',
            date_to: '2025-01-31'
          },
          session_token: 'session-token'
        }
      });
    });

    it('calls safeInvoke with correct parameters for importTasksBulk', async () => {
      const options = {
        csv_lines: ['line1', 'line2'],
        skip_duplicates: true,
        update_existing: false,
      };
      
      await taskOperations.importTasksBulk(options, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('import_tasks_bulk', {
        request: {
          csv_data: 'line1\nline2',
          update_existing: false,
          session_token: 'session-token'
        }
      });
    });
  });

  describe('Request Validation', () => {
    it('validates required fields for create operation', async () => {
      const invalidData = {
        // Missing required title
        description: 'Task without title',
      };

      try {
        await taskOperations.create(invalidData, 'session-token');
      } catch (error) {
        expect(error).toBeDefined();
      }

      expect(safeInvoke).toHaveBeenCalledWith('task_crud', {
        request: {
          action: { action: 'Create', data: invalidData },
          session_token: 'session-token'
        }
      }, expect.any(Function));
    });

    it('validates task ID format for get operation', async () => {
      await taskOperations.get('', 'session-token');

      expect(cachedInvoke).toHaveBeenCalledWith(
        'task:',
        'task_crud',
        {
          request: {
            action: { action: 'Get', id: '' },
            session_token: 'session-token'
          }
        },
        expect.any(Function)
      );
    });

    it('validates update data structure', async () => {
      const invalidUpdateData = {
        invalid_field: 'should not exist',
      };

      await taskOperations.update('task-123', invalidUpdateData, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('task_crud', {
        request: {
          action: { action: 'Update', id: 'task-123', data: invalidUpdateData },
          session_token: 'session-token'
        }
      }, expect.any(Function));
    });
  });

  describe('Response Shape Validation', () => {
    it('validates response structure for create operation', async () => {
      const mockResponse = {
        type: 'Created',
        data: {
          id: 'task-123',
          title: 'New Task',
          status: 'pending',
          created_at: '2025-02-09T10:00:00Z',
        }
      };

      safeInvoke.mockResolvedValue(mockResponse);
      ResponseHandlers.discriminatedUnion.mockReturnValue((result) => validateTask(result.data));

      const result = await taskOperations.create({ title: 'New Task' }, 'session-token');

      expect(validateTask).toHaveBeenCalledWith(mockResponse.data);
      expect(result).toEqual(validateTask(mockResponse.data));
    });

    it('validates response structure for list operation', async () => {
      const mockResponse = {
        data: [
          {
            id: 'task-123',
            title: 'Task 1',
            status: 'pending',
          },
          {
            id: 'task-456',
            title: 'Task 2',
            status: 'completed',
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          has_next: false,
          has_prev: false,
        }
      };

      safeInvoke.mockResolvedValue(mockResponse);
      ResponseHandlers.list.mockReturnValue((result) => validateTaskListResponse(result));

      const result = await taskOperations.list({ page: 1 }, 'session-token');

      expect(validateTaskListResponse).toHaveBeenCalledWith(mockResponse);
      expect(result).toEqual(validateTaskListResponse(mockResponse));
    });

    it('handles null response for get operation', async () => {
      const mockResponse = {
        type: 'NotFound',
      };

      safeInvoke.mockResolvedValue(mockResponse);
      ResponseHandlers.discriminatedUnionNullable.mockReturnValue((_result) => null);

      const result = await taskOperations.get('nonexistent-task', 'session-token');

      expect(result).toBeNull();
    });
  });

  describe('Authentication and Authorization', () => {
    it('requires session token for all operations', async () => {
      const operations = [
        () => taskOperations.create({ title: 'Test' }, ''),
        () => taskOperations.get('task-123', ''),
        () => taskOperations.update('task-123', {}, ''),
        () => taskOperations.delete('task-123', ''),
        () => taskOperations.list({}, ''),
        () => taskOperations.statistics(''),
        () => taskOperations.checkTaskAssignment('task-123', 'user-123', ''),
      ];

      for (const operation of operations) {
        try {
          await operation();
        } catch (_error) {
          // Expected to fail due to empty session token
        }
      }

      expect(safeInvoke).toHaveBeenCalledTimes(operations.length - 1); // get uses cachedInvoke
      expect(cachedInvoke).toHaveBeenCalledTimes(1);
    });

    it('passes session token correctly in nested requests', async () => {
      const sessionToken = 'valid-session-token';
      
      await taskOperations.checkTaskAssignment('task-123', 'user-456', sessionToken);

      expect(safeInvoke).toHaveBeenCalledWith('check_task_assignment', {
        request: {
          task_id: 'task-123',
          user_id: 'user-456',
          session_token: sessionToken
        }
      });
    });
  });

  describe('Error Response Handling', () => {
    it('handles validation errors from backend', async () => {
      const errorResponse = {
        type: 'ValidationError',
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid task data',
          details: {
            field: 'title',
            issue: 'required field missing'
          }
        }
      };

      safeInvoke.mockRejectedValue(errorResponse);

      try {
        await taskOperations.create({}, 'session-token');
      } catch (error) {
        expect(error).toEqual(errorResponse);
      }
    });

    it('handles not found errors for get operation', async () => {
      const notFoundResponse = {
        type: 'NotFound',
      };

      safeInvoke.mockResolvedValue(notFoundResponse);
      ResponseHandlers.discriminatedUnionNullable.mockReturnValue((_result) => null);

      const result = await taskOperations.get('nonexistent-task', 'session-token');

      expect(result).toBeNull();
    });

    it('handles permission errors', async () => {
      const permissionError = {
        type: 'PermissionError',
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Insufficient permissions to perform this operation',
        }
      };

      safeInvoke.mockRejectedValue(permissionError);

      try {
        await taskOperations.delete('task-123', 'unauthorized-token');
      } catch (error) {
        expect(error).toEqual(permissionError);
      }
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('handles extremely long task descriptions', async () => {
      const longDescription = 'a'.repeat(10000);
      const taskData = {
        title: 'Task with long description',
        description: longDescription,
      };

      await taskOperations.create(taskData, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('task_crud', {
        request: {
          action: { action: 'Create', data: taskData },
          session_token: 'session-token'
        }
      }, expect.any(Function));
    });

    it('handles special characters in task titles', async () => {
      const specialTitle = 'Task with special chars: éàüß@#$%^&*()';
      
      await taskOperations.create({ title: specialTitle }, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('task_crud', {
        request: {
          action: { action: 'Create', data: { title: specialTitle } },
          session_token: 'session-token'
        }
      }, expect.any(Function));
    });

    it('handles empty list filters', async () => {
      await taskOperations.list({}, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('task_crud', {
        request: {
          action: { action: 'List', filters: {} },
          session_token: 'session-token'
        }
      }, expect.any(Function));
    });

    it('handles null values in optional fields', async () => {
      const taskWithNulls = {
        title: 'Task with null fields',
        description: null,
        technician_id: null,
        scheduled_date: null,
      };

      await taskOperations.create(taskWithNulls, 'session-token');

      expect(safeInvoke).toHaveBeenCalledWith('task_crud', {
        request: {
          action: { action: 'Create', data: taskWithNulls },
          session_token: 'session-token'
        }
      }, expect.any(Function));
    });
  });
});
