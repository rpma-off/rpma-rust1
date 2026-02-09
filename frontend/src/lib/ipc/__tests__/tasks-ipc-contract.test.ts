import { ipcClient } from '../client';

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

const { safeInvoke } = jest.requireMock('../utils') as {
  safeInvoke: jest.Mock;
};

const { cachedInvoke, invalidatePattern } = jest.requireMock('../cache') as {
  cachedInvoke: jest.Mock;
  invalidatePattern: jest.Mock;
};

describe('ipcClient.tasks IPC argument shapes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    safeInvoke.mockResolvedValue('ok');
    cachedInvoke.mockResolvedValue({
      tasks: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        has_next: false,
        has_prev: false,
      },
    });
  });

  // Basic CRUD Operations
  describe('Task CRUD operations', () => {
    it('uses top-level sessionToken for tasks_list', async () => {
      await ipcClient.tasks.list('token-a', {
        page: 1,
        limit: 20,
        status: 'pending',
        priority: 'high',
        search: 'test',
        technician_id: 'tech-123',
        start_date: '2025-02-01',
        end_date: '2025-02-28',
      });

      expect(safeInvoke).toHaveBeenCalledWith('tasks_list', {
        sessionToken: 'token-a',
        page: 1,
        limit: 20,
        status: 'pending',
        priority: 'high',
        search: 'test',
        technician_id: 'tech-123',
        start_date: '2025-02-01',
        end_date: '2025-02-28',
      });
    });

    it('uses nested request.session_token for task_create', async () => {
      await ipcClient.tasks.create(
        {
          title: 'New PPF Installation',
          description: 'Full vehicle PPF installation',
          vehicle_plate: 'ABC-123',
          vehicle_model: 'Model 3',
          vehicle_make: 'Tesla',
          ppf_zones: ['hood', 'fender', 'mirror'],
          scheduled_date: '2025-02-15',
          priority: 'high',
          technician_id: 'tech-123',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          customer_phone: '555-1234',
          tags: 'ppf,tesla,priority',
        },
        'token-b'
      );

      expect(safeInvoke).toHaveBeenCalledWith('task_create', {
        request: {
          title: 'New PPF Installation',
          description: 'Full vehicle PPF installation',
          vehicle_plate: 'ABC-123',
          vehicle_model: 'Model 3',
          vehicle_make: 'Tesla',
          ppf_zones: ['hood', 'fender', 'mirror'],
          scheduled_date: '2025-02-15',
          priority: 'high',
          technician_id: 'tech-123',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          customer_phone: '555-1234',
          tags: 'ppf,tesla,priority',
          session_token: 'token-b',
        },
      });
    });

    it('uses nested request.session_token for task_update', async () => {
      await ipcClient.tasks.update(
        'task-123',
        {
          title: 'Updated Task Title',
          status: 'in_progress',
          priority: 'medium',
          notes: 'Task updated with new information',
        },
        'token-c'
      );

      expect(safeInvoke).toHaveBeenCalledWith('task_update', {
        id: 'task-123',
        request: {
          title: 'Updated Task Title',
          status: 'in_progress',
          priority: 'medium',
          notes: 'Task updated with new information',
          session_token: 'token-c',
        },
      });
    });

    it('uses top-level sessionToken for task_get', async () => {
      await ipcClient.tasks.get('task-123', 'token-d');

      expect(safeInvoke).toHaveBeenCalledWith('task_get', {
        sessionToken: 'token-d',
        id: 'task-123',
      });
    });

    it('uses top-level sessionToken for task_delete', async () => {
      await ipcClient.tasks.delete('task-123', 'token-e');

      expect(safeInvoke).toHaveBeenCalledWith('task_delete', {
        sessionToken: 'token-e',
        id: 'task-123',
      });
    });
  });

  // Specialized Task Operations
  describe('Specialized Task operations', () => {
    it('uses nested request.session_token for check_task_assignment', async () => {
      await ipcClient.tasks.checkAssignment(
        'task-123',
        'tech-456',
        'token-f'
      );

      expect(safeInvoke).toHaveBeenCalledWith('task_check_assignment', {
        request: {
          task_id: 'task-123',
          technician_id: 'tech-456',
          session_token: 'token-f',
        },
      });
    });

    it('uses nested request.session_token for assign_task', async () => {
      await ipcClient.tasks.assign(
        'task-123',
        'tech-456',
        {
          assigned_date: '2025-02-10',
          estimated_duration: 120,
          notes: 'Technician available and qualified',
        },
        'token-g'
      );

      expect(safeInvoke).toHaveBeenCalledWith('task_assign', {
        request: {
          task_id: 'task-123',
          technician_id: 'tech-456',
          assigned_date: '2025-02-10',
          estimated_duration: 120,
          notes: 'Technician available and qualified',
          session_token: 'token-g',
        },
      });
    });

    it('uses nested request.session_token for delay_task', async () => {
      await ipcClient.tasks.delay(
        'task-123',
        {
          new_date: '2025-02-20',
          reason: 'Customer requested delay',
          delay_type: 'customer_request',
        },
        'token-h'
      );

      expect(safeInvoke).toHaveBeenCalledWith('task_delay', {
        request: {
          task_id: 'task-123',
          new_date: '2025-02-20',
          reason: 'Customer requested delay',
          delay_type: 'customer_request',
          session_token: 'token-h',
        },
      });
    });

    it('uses nested request.session_token for complete_task', async () => {
      await ipcClient.tasks.complete(
        'task-123',
        {
          completion_notes: 'Installation completed successfully',
          actual_duration: 110,
          quality_score: 4.8,
          photos: ['photo-1.jpg', 'photo-2.jpg'],
        },
        'token-i'
      );

      expect(safeInvoke).toHaveBeenCalledWith('task_complete', {
        request: {
          task_id: 'task-123',
          completion_notes: 'Installation completed successfully',
          actual_duration: 110,
          quality_score: 4.8,
          photos: ['photo-1.jpg', 'photo-2.jpg'],
          session_token: 'token-i',
        },
      });
    });

    it('uses nested request.session_token for report_task_issue', async () => {
      await ipcClient.tasks.reportIssue(
        'task-123',
        {
          issue_type: 'material_shortage',
          description: 'Insufficient PPF film for complete installation',
          severity: 'medium',
          requires_intervention: true,
        },
        'token-j'
      );

      expect(safeInvoke).toHaveBeenCalledWith('task_report_issue', {
        request: {
          task_id: 'task-123',
          issue_type: 'material_shortage',
          description: 'Insufficient PPF film for complete installation',
          severity: 'medium',
          requires_intervention: true,
          session_token: 'token-j',
        },
      });
    });
  });

  // Bulk Operations
  describe('Bulk operations', () => {
    it('uses nested request.session_token for update_multiple_tasks', async () => {
      await ipcClient.tasks.updateMultiple(
        {
          task_ids: ['task-123', 'task-456', 'task-789'],
          updates: {
            priority: 'high',
            technician_id: 'tech-456',
          },
        },
        'token-k'
      );

      expect(safeInvoke).toHaveBeenCalledWith('task_update_multiple', {
        request: {
          task_ids: ['task-123', 'task-456', 'task-789'],
          updates: {
            priority: 'high',
            technician_id: 'tech-456',
          },
          session_token: 'token-k',
        },
      });
    });

    it('uses nested request.session_token for bulk_delete', async () => {
      await ipcClient.tasks.bulkDelete(
        {
          task_ids: ['task-123', 'task-456'],
          delete_reason: 'Duplicate tasks',
        },
        'token-l'
      );

      expect(safeInvoke).toHaveBeenCalledWith('task_bulk_delete', {
        request: {
          task_ids: ['task-123', 'task-456'],
          delete_reason: 'Duplicate tasks',
          session_token: 'token-l',
        },
      });
    });
  });

  // Import/Export Operations
  describe('Import/Export operations', () => {
    it('uses top-level sessionToken for export_tasks_csv', async () => {
      await ipcClient.tasks.exportCsv('token-m', {
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        status: 'completed',
        include_interventions: true,
      });

      expect(safeInvoke).toHaveBeenCalledWith('task_export_csv', {
        sessionToken: 'token-m',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        status: 'completed',
        include_interventions: true,
      });
    });

    it('uses nested request.session_token for import_tasks_bulk', async () => {
      await ipcClient.tasks.importBulk(
        {
          format: 'csv',
          data: 'task,customer,vehicle,etc...',
          options: {
            create_missing_customers: true,
            default_priority: 'medium',
            validate_only: false,
          },
        },
        'token-n'
      );

      expect(safeInvoke).toHaveBeenCalledWith('task_import_bulk', {
        request: {
          format: 'csv',
          data: 'task,customer,vehicle,etc...',
          options: {
            create_missing_customers: true,
            default_priority: 'medium',
            validate_only: false,
          },
          session_token: 'token-n',
        },
      });
    });
  });

  // Search and Filtering
  describe('Search and filtering', () => {
    it('uses top-level sessionToken for search_tasks', async () => {
      await ipcClient.tasks.search('token-o', {
        query: 'PPF Tesla',
        filters: {
          status: ['pending', 'assigned'],
          priority: ['high', 'medium'],
          technicians: ['tech-123', 'tech-456'],
        },
        sort: {
          field: 'scheduled_date',
          direction: 'asc',
        },
        pagination: {
          page: 2,
          limit: 25,
        },
      });

      expect(safeInvoke).toHaveBeenCalledWith('task_search', {
        sessionToken: 'token-o',
        query: 'PPF Tesla',
        filters: {
          status: ['pending', 'assigned'],
          priority: ['high', 'medium'],
          technicians: ['tech-123', 'tech-456'],
        },
        sort: {
          field: 'scheduled_date',
          direction: 'asc',
        },
        pagination: {
          page: 2,
          limit: 25,
        },
      });
    });

    it('uses top-level sessionToken for get_task_statistics', async () => {
      await ipcClient.tasks.getStatistics('token-p', {
        period: 'month',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        group_by: 'status',
      });

      expect(safeInvoke).toHaveBeenCalledWith('task_get_statistics', {
        sessionToken: 'token-p',
        period: 'month',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        group_by: 'status',
      });
    });
  });

  // Template Operations
  describe('Template operations', () => {
    it('uses top-level sessionToken for get_task_templates', async () => {
      await ipcClient.tasks.getTemplates('token-q', {
        category: 'ppf_installation',
        vehicle_type: 'sedan',
      });

      expect(safeInvoke).toHaveBeenCalledWith('task_get_templates', {
        sessionToken: 'token-q',
        category: 'ppf_installation',
        vehicle_type: 'sedan',
      });
    });

    it('uses nested request.session_token for create_task_from_template', async () => {
      await ipcClient.tasks.createFromTemplate(
        {
          template_id: 'template-123',
          vehicle_plate: 'XYZ-789',
          customer_name: 'Jane Smith',
          scheduled_date: '2025-02-20',
          technician_id: 'tech-456',
          custom_fields: {
            special_requirements: 'Customer requested extra protection',
          },
        },
        'token-r'
      );

      expect(safeInvoke).toHaveBeenCalledWith('task_create_from_template', {
        request: {
          template_id: 'template-123',
          vehicle_plate: 'XYZ-789',
          customer_name: 'Jane Smith',
          scheduled_date: '2025-02-20',
          technician_id: 'tech-456',
          custom_fields: {
            special_requirements: 'Customer requested extra protection',
          },
          session_token: 'token-r',
        },
      });
    });
  });

  // Cache Invalidation Tests
  describe('Cache invalidation', () => {
    it('invalidates cache patterns for task_update', async () => {
      await ipcClient.tasks.update(
        'task-123',
        {
          title: 'Updated Task Title',
          status: 'in_progress',
        },
        'token-c'
      );

      expect(invalidatePattern).toHaveBeenCalledWith('tasks:*');
      expect(invalidatePattern).toHaveBeenCalledWith('task:*');
    });

    it('invalidates cache patterns for task_delete', async () => {
      await ipcClient.tasks.delete('task-123', 'token-e');

      expect(invalidatePattern).toHaveBeenCalledWith('tasks:*');
      expect(invalidatePattern).toHaveBeenCalledWith('task:*');
    });

    it('invalidates cache patterns for update_multiple_tasks', async () => {
      await ipcClient.tasks.updateMultiple(
        {
          task_ids: ['task-123', 'task-456'],
          updates: { priority: 'high' },
        },
        'token-k'
      );

      expect(invalidatePattern).toHaveBeenCalledWith('tasks:*');
      expect(invalidatePattern).toHaveBeenCalledWith('task:*');
    });

    it('invalidates cache patterns for bulk_delete', async () => {
      await ipcClient.tasks.bulkDelete(
        {
          task_ids: ['task-123', 'task-456'],
          delete_reason: 'Duplicate tasks',
        },
        'token-l'
      );

      expect(invalidatePattern).toHaveBeenCalledWith('tasks:*');
      expect(invalidatePattern).toHaveBeenCalledWith('task:*');
    });
  });

  // Response Shape Tests
  describe('Response shape validation', () => {
    it('returns expected shape for tasks_list', async () => {
      const mockResponse = {
        success: true,
        data: {
          tasks: [
            {
              id: 'task-123',
              title: 'PPF Installation',
              status: 'pending',
              priority: 'high',
              vehicle_plate: 'ABC-123',
              vehicle_model: 'Model 3',
              vehicle_make: 'Tesla',
              scheduled_date: '2025-02-15',
              created_at: '2025-02-09T10:00:00Z',
              updated_at: '2025-02-09T10:00:00Z',
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            has_next: false,
            has_prev: false,
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.tasks.list('token-a');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('tasks');
      expect(result.data).toHaveProperty('pagination');
      expect(Array.isArray(result.data.tasks)).toBe(true);
      expect(result.data.tasks[0]).toHaveProperty('id');
      expect(result.data.tasks[0]).toHaveProperty('title');
      expect(result.data.tasks[0]).toHaveProperty('status');
    });

    it('returns expected shape for task_get', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'task-123',
          title: 'PPF Installation',
          description: 'Full vehicle PPF installation',
          status: 'in_progress',
          priority: 'high',
          vehicle_plate: 'ABC-123',
          vehicle_model: 'Model 3',
          vehicle_make: 'Tesla',
          ppf_zones: ['hood', 'fender', 'mirror'],
          scheduled_date: '2025-02-15',
          technician_id: 'tech-123',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          created_at: '2025-02-09T10:00:00Z',
          updated_at: '2025-02-09T10:00:00Z',
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.tasks.get('task-123', 'token-d');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('title');
      expect(result.data).toHaveProperty('status');
      expect(result.data).toHaveProperty('ppf_zones');
      expect(Array.isArray(result.data.ppf_zones)).toBe(true);
    });

    it('returns expected shape for get_task_statistics', async () => {
      const mockResponse = {
        success: true,
        data: {
          period: 'month',
          start_date: '2025-01-01',
          end_date: '2025-01-31',
          statistics: {
            total_tasks: 45,
            completed_tasks: 38,
            pending_tasks: 5,
            in_progress_tasks: 2,
            average_duration: 115,
            completion_rate: 84.4,
          },
          breakdown: {
            pending: 5,
            assigned: 10,
            in_progress: 2,
            completed: 38,
            cancelled: 0,
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.tasks.getStatistics('token-p');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('period');
      expect(result.data).toHaveProperty('statistics');
      expect(result.data).toHaveProperty('breakdown');
      expect(result.data.statistics).toHaveProperty('total_tasks');
      expect(result.data.statistics).toHaveProperty('completion_rate');
    });
  });

  // Error Response Tests
  describe('Error response handling', () => {
    it('handles validation errors for task_create', async () => {
      const mockResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Vehicle plate is required',
          details: {
            field: 'vehicle_plate',
            value: '',
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.tasks.create(
        {
          title: 'Test Task',
          description: 'Test description',
        },
        'token-b'
      );

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(result.error).toHaveProperty('message');
    });

    it('handles not found errors for task_get', async () => {
      const mockResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Task not found',
          details: {
            task_id: 'non-existent-task',
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.tasks.get('non-existent-task', 'token-d');

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('handles assignment conflicts for assign_task', async () => {
      const mockResponse = {
        success: false,
        error: {
          code: 'ASSIGNMENT_CONFLICT',
          message: 'Task is already assigned to another technician',
          details: {
            task_id: 'task-123',
            current_technician_id: 'tech-789',
            requested_technician_id: 'tech-456',
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.tasks.assign(
        'task-123',
        'tech-456',
        {},
        'token-g'
      );

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toHaveProperty('code', 'ASSIGNMENT_CONFLICT');
    });
  });
});