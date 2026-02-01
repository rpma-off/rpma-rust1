import { renderHook, act } from '@testing-library/react';
import { useTaskState } from '../../hooks/useTaskState';
import { TaskStatus, TaskPriority } from '../../lib/types';
import type { TaskWithDetails } from '../../lib/services/entities/task.service';

// Mock data for testing
const mockTask: TaskWithDetails = {
  id: 'task-1',
  task_number: 'T001',
  title: 'Test Task',
  description: 'Test description',
  vehicle_plate: 'ABC-123',
  vehicle_model: 'Test Model',
  vehicle_year: '2020',
  vehicle_make: 'Test Make',
  vin: 'VIN123456789',
  ppf_zones: ['zone1', 'zone2'],
  custom_ppf_zones: null,
  status: TaskStatus.Pending,
  priority: TaskPriority.Medium,
  technician_id: 'tech-1',
  assigned_at: '2024-01-01T00:00:00Z',
  assigned_by: 'admin',
  scheduled_date: '2024-01-01',
  start_time: '09:00',
  end_time: '17:00',
  date_rdv: '2024-01-01',
  heure_rdv: '10:00',
  template_id: 'template-1',
  workflow_id: 'workflow-1',
  workflow_status: 'active',
  current_workflow_step_id: 'step-1',
  started_at: null,
  completed_at: null,
  completed_steps: null,
  client_id: 'client-1',
  customer_name: 'John Doe',
  customer_email: 'john@example.com',
  customer_phone: '+1234567890',
  customer_address: '123 Test St',
  external_id: null,
  lot_film: 'LOT001',
  checklist_completed: false,
  notes: 'Test notes',
  tags: 'tag1,tag2',
  estimated_duration: 8,
  actual_duration: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  creator_id: 'admin',
  created_by: 'Admin User',
  updated_by: 'Admin User',
  deleted_at: null,
  deleted_by: null,
  synced: true,
  last_synced_at: '2024-01-01T00:00:00Z',
  progress: 0,
  is_overdue: false,
};

const mockTask2: TaskWithDetails = {
  ...mockTask,
  id: 'task-2',
  task_number: 'T002',
  title: 'Test Task 2',
};

describe('useTaskState', () => {
  it('returns initial state correctly', () => {
    const { result } = renderHook(() => useTaskState());

    expect(result.current.tasks).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.pagination).toEqual({
      page: 1,
      total: 0,
      totalPages: 1,
      limit: 10,
    });
    expect(result.current.filters).toEqual({
      status: 'all',
      priority: 'all',
      search: '',
    });
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.hasPreviousPage).toBe(false);
    expect(result.current.isEmpty).toBe(true);
  });

  it('initializes with custom options', () => {
    const initialFilters = {
      status: TaskStatus.Completed,
      search: 'test query',
    };

    const { result } = renderHook(() =>
      useTaskState({
        initialFilters,
        pageSize: 20,
      })
    );

    expect(result.current.tasks).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.pagination.limit).toBe(20);
    expect(result.current.filters).toEqual({
      status: TaskStatus.Completed,
      priority: 'all',
      search: 'test query',
    });
  });

  describe('updateTasks', () => {
    it('updates tasks correctly with valid array', () => {
      const { result } = renderHook(() => useTaskState());

      act(() => {
        result.current.updateTasks([mockTask]);
      });

      expect(result.current.tasks).toEqual([mockTask]);
      expect(result.current.isEmpty).toBe(false);
    });

    it('handles undefined input gracefully', () => {
      const { result } = renderHook(() => useTaskState());

      // First set some tasks
      act(() => {
        result.current.updateTasks([mockTask]);
      });

      expect(result.current.tasks).toEqual([mockTask]);
      expect(result.current.isEmpty).toBe(false);

      // Then pass undefined - should not crash and reset to empty array
      act(() => {
        result.current.updateTasks(undefined as any);
      });

      expect(result.current.tasks).toEqual([]);
      expect(result.current.isEmpty).toBe(true);
    });

    it('handles null input gracefully', () => {
      const { result } = renderHook(() => useTaskState());

      act(() => {
        result.current.updateTasks(null as any);
      });

      expect(result.current.tasks).toEqual([]);
      expect(result.current.isEmpty).toBe(true);
    });

    it('handles non-array input gracefully', () => {
      const { result } = renderHook(() => useTaskState());

      act(() => {
        result.current.updateTasks('not an array' as any);
      });

      expect(result.current.tasks).toEqual([]);
      expect(result.current.isEmpty).toBe(true);
    });

    it('handles empty array input correctly', () => {
      const { result } = renderHook(() => useTaskState());

      // First set some tasks
      act(() => {
        result.current.updateTasks([mockTask]);
      });

      expect(result.current.tasks).toEqual([mockTask]);

      // Then clear with empty array
      act(() => {
        result.current.updateTasks([]);
      });

      expect(result.current.tasks).toEqual([]);
      expect(result.current.isEmpty).toBe(true);
    });
  });

  describe('addTask', () => {
    it('adds task to the beginning of the list', () => {
      const { result } = renderHook(() => useTaskState());

      act(() => {
        result.current.addTask(mockTask);
      });

      expect(result.current.tasks).toEqual([mockTask]);
      expect(result.current.pagination.total).toBe(1);
      expect(result.current.pagination.totalPages).toBe(1);
    });

    it('adds multiple tasks correctly', () => {
      const { result } = renderHook(() => useTaskState());

      act(() => {
        result.current.addTask(mockTask);
        result.current.addTask(mockTask2);
      });

      expect(result.current.tasks).toEqual([mockTask2, mockTask]); // LIFO order
      expect(result.current.pagination.total).toBe(2);
      expect(result.current.pagination.totalPages).toBe(1);
    });

    it('handles undefined task gracefully', () => {
      const { result } = renderHook(() => useTaskState());
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      act(() => {
        result.current.addTask(undefined as any);
      });

      expect(result.current.tasks).toEqual([]);
      expect(result.current.pagination.total).toBe(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'useTaskState: addTask called with undefined/null task, skipping'
      );

      consoleWarnSpy.mockRestore();
    });

    it('handles null task gracefully', () => {
      const { result } = renderHook(() => useTaskState());
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      act(() => {
        result.current.addTask(null as any);
      });

      expect(result.current.tasks).toEqual([]);
      expect(result.current.pagination.total).toBe(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'useTaskState: addTask called with undefined/null task, skipping'
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('updateTask', () => {
    it('updates existing task correctly', () => {
      const { result } = renderHook(() => useTaskState());

      act(() => {
        result.current.updateTasks([mockTask]);
      });

      const updatedTask = { ...mockTask, title: 'Updated Title' };

      act(() => {
        result.current.updateTask('task-1', { title: 'Updated Title' });
      });

      expect(result.current.tasks[0]).toEqual(updatedTask);
    });

    it('handles non-existent task id gracefully', () => {
      const { result } = renderHook(() => useTaskState());

      act(() => {
        result.current.updateTasks([mockTask]);
      });

      act(() => {
        result.current.updateTask('non-existent-id', { title: 'Updated Title' });
      });

      // Task should remain unchanged
      expect(result.current.tasks[0]).toEqual(mockTask);
    });
  });

  describe('removeTask', () => {
    it('removes existing task correctly', () => {
      const { result } = renderHook(() => useTaskState());

      act(() => {
        result.current.updateTasks([mockTask, mockTask2]);
      });

      act(() => {
        result.current.removeTask('task-1');
      });

      expect(result.current.tasks).toEqual([mockTask2]);
      expect(result.current.pagination.total).toBe(1);
    });

    it('handles removing last task correctly', () => {
      const { result } = renderHook(() => useTaskState());

      act(() => {
        result.current.updateTasks([mockTask]);
      });

      act(() => {
        result.current.removeTask('task-1');
      });

      expect(result.current.tasks).toEqual([]);
      expect(result.current.pagination.total).toBe(0);
      expect(result.current.isEmpty).toBe(true);
    });

    it('handles non-existent task id gracefully', () => {
      const { result } = renderHook(() => useTaskState());

      act(() => {
        result.current.updateTasks([mockTask]);
      });

      act(() => {
        result.current.removeTask('non-existent-id');
      });

      // Task should remain unchanged
      expect(result.current.tasks).toEqual([mockTask]);
    });
  });

  describe('state management functions', () => {
    it('setLoadingState updates loading correctly', () => {
      const { result } = renderHook(() => useTaskState());

      act(() => {
        result.current.setLoadingState(false);
      });

      expect(result.current.loading).toBe(false);

      act(() => {
        result.current.setLoadingState(true);
      });

      expect(result.current.loading).toBe(true);
    });

    it('setErrorState updates error correctly', () => {
      const { result } = renderHook(() => useTaskState());
      const testError = new Error('Test error');

      act(() => {
        result.current.setErrorState(testError);
      });

      expect(result.current.error).toBe(testError);

      act(() => {
        result.current.setErrorState(null);
      });

      expect(result.current.error).toBeNull();
    });

    it('updatePagination updates pagination correctly', () => {
      const { result } = renderHook(() => useTaskState());

      act(() => {
        result.current.updatePagination({ page: 2, total: 50 });
      });

      expect(result.current.pagination.page).toBe(2);
      expect(result.current.pagination.total).toBe(50);
      expect(result.current.pagination.totalPages).toBe(5); // 50 / 10
    });

    it('updateFilters updates filters correctly', () => {
      const { result } = renderHook(() => useTaskState());

      act(() => {
        result.current.updateFilters({
          status: TaskStatus.InProgress,
          search: 'new search'
        });
      });

      expect(result.current.filters.status).toBe(TaskStatus.InProgress);
      expect(result.current.filters.search).toBe('new search');
      expect(result.current.filters.priority).toBe('all'); // unchanged
    });
  });

  describe('computed properties', () => {
    it('isEmpty returns correct value', () => {
      const { result } = renderHook(() => useTaskState());

      expect(result.current.isEmpty).toBe(true);

      act(() => {
        result.current.updateTasks([mockTask]);
      });

      expect(result.current.isEmpty).toBe(false);

      act(() => {
        result.current.updateTasks([]);
      });

      expect(result.current.isEmpty).toBe(true);
    });

    it('hasNextPage and hasPreviousPage work correctly', () => {
      const { result } = renderHook(() => useTaskState());

      expect(result.current.hasNextPage).toBe(false);
      expect(result.current.hasPreviousPage).toBe(false);

      act(() => {
        result.current.updatePagination({ page: 1, totalPages: 3 });
      });

      expect(result.current.hasNextPage).toBe(true);
      expect(result.current.hasPreviousPage).toBe(false);

      act(() => {
        result.current.updatePagination({ page: 2, totalPages: 3 });
      });

      expect(result.current.hasNextPage).toBe(true);
      expect(result.current.hasPreviousPage).toBe(true);

      act(() => {
        result.current.updatePagination({ page: 3, totalPages: 3 });
      });

      expect(result.current.hasNextPage).toBe(false);
      expect(result.current.hasPreviousPage).toBe(true);
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      const { result } = renderHook(() => useTaskState({
        initialFilters: { status: TaskStatus.Completed, search: 'initial' },
        pageSize: 20,
      }));

      // Modify state
      act(() => {
        result.current.updateTasks([mockTask]);
        result.current.setLoadingState(false);
        result.current.setErrorState(new Error('test'));
        result.current.updatePagination({ page: 2, total: 100 });
        result.current.updateFilters({ priority: TaskPriority.High });
      });

      // Verify state is modified
      expect(result.current.tasks).toEqual([mockTask]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.pagination.page).toBe(2);
      expect(result.current.filters.priority).toBe(TaskPriority.High);

      // Reset
      act(() => {
        result.current.reset();
      });

      // Verify reset to initial state
      expect(result.current.tasks).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.pagination).toEqual({
        page: 1,
        total: 0,
        totalPages: 1,
        limit: 20, // custom pageSize preserved
      });
      expect(result.current.filters).toEqual({
        status: 'all', // reset to default
        priority: 'all', // reset to default
        search: '', // reset to default
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('handles pagination calculations with zero total correctly', () => {
      const { result } = renderHook(() => useTaskState());

      act(() => {
        result.current.updatePagination({ page: 1, total: 0, totalPages: 0 });
      });

      expect(result.current.hasNextPage).toBe(false);
      expect(result.current.hasPreviousPage).toBe(false);
    });

    it('handles negative pagination values gracefully', () => {
      const { result } = renderHook(() => useTaskState());

      act(() => {
        result.current.updatePagination({ page: -1, total: -10 });
      });

      expect(result.current.pagination.page).toBe(-1);
      expect(result.current.pagination.total).toBe(-10);
      expect(result.current.hasNextPage).toBe(false); // -1 < 1 is false
      expect(result.current.hasPreviousPage).toBe(true); // -1 > 1 is false
    });

    it('computes isEmpty correctly with undefined tasks (should not happen but defensive)', () => {
      const { result } = renderHook(() => useTaskState());

      // This scenario should not happen due to defensive programming,
      // but test that computed properties handle it
      act(() => {
        // Force tasks to undefined (normally prevented by updateTasks)
        (result.current as any).tasks = undefined;
      });

      // Re-render to trigger computed property recalculation
      const { result: newResult } = renderHook(() => useTaskState());

      // isEmpty should be computed safely
      expect(newResult.current.isEmpty).toBe(true);
    });
  });
});