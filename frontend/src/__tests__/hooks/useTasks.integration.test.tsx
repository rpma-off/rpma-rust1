import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTasks } from '../../hooks/useTasks';
import { taskService } from '../../lib/services/entities/task.service';
import type { TaskWithDetails } from '../../lib/services/entities/task.service';

// Mock dependencies
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { token: 'mock-token-123' },
  }),
}));

jest.mock('../../lib/services/entities/task.service', () => ({
  taskService: {
    getTasks: jest.fn(),
  },
}));

jest.mock('../../lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock task data
const mockTask: TaskWithDetails = {
  id: 'task-1',
  task_number: 'T001',
  title: 'Test Task',
  description: 'Test description',
  vehicle_plate: 'ABC-123',
  vehicle_model: 'Test Model',
  vehicle_year: 2020,
  vehicle_make: 'Test Make',
  vin: 'VIN123456789',
  ppf_zones: ['zone1', 'zone2'],
  custom_ppf_zones: null,
  status: 'pending',
  priority: 'medium',
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
};

const mockTask2: TaskWithDetails = {
  ...mockTask,
  id: 'task-2',
  task_number: 'T002',
  title: 'Test Task 2',
};

// Mock API response
const mockApiResponse = {
  success: true,
  data: {
    data: [mockTask, mockTask2],
    pagination: {
      page: 1,
      total: 2,
      total_pages: 1,
      limit: 10,
    },
  },
  status: 200,
};

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  TestWrapper.displayName = 'TestWrapper';
  
  return TestWrapper;
};

describe('useTasks (Integration)', () => {
  const mockTaskService = taskService as jest.Mocked<typeof taskService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTaskService.getTasks.mockResolvedValue(mockApiResponse as any);
  });

  it('loads tasks on mount with default options', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useTasks(), { wrapper });

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.tasks).toEqual([]);
    expect(result.current.error).toBeNull();

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tasks).toEqual([mockTask, mockTask2]);
    expect(result.current.pagination).toEqual({
      page: 1,
      total: 2,
      totalPages: 1,
      limit: 10,
    });
    expect(result.current.error).toBeNull();
    expect(mockTaskService.getTasks).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      status: undefined,
      search: undefined,
      technician_id: undefined,
      sort_by: 'created_at',
      sort_order: 'desc',
    });
  });

  it('handles undefined data.data gracefully', async () => {
    const responseWithUndefinedData = {
      success: true,
      data: {
        data: undefined, // Simulate undefined data
        pagination: {
          page: 1,
          total: 0,
          total_pages: 1,
          limit: 10,
        },
      },
      status: 200,
    };

    mockTaskService.getTasks.mockResolvedValue(responseWithUndefinedData as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTasks(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should handle undefined data gracefully
    expect(result.current.tasks).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('handles null data.data gracefully', async () => {
    const responseWithNullData = {
      success: true,
      data: {
        data: null, // Simulate null data
        pagination: {
          page: 1,
          total: 0,
          total_pages: 1,
          limit: 10,
        },
      },
      status: 200,
    };

    mockTaskService.getTasks.mockResolvedValue(responseWithNullData as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTasks(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should handle null data gracefully
    expect(result.current.tasks).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});