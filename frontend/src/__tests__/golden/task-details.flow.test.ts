/**
 * Golden Flow: Task Details
 *
 * Tests task detail retrieval and list through the IPC layer:
 *   1. Get task by ID (success)
 *   2. Get task (not found)
 *   3. List tasks with pagination
 *   4. Task statistics
 */

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));
jest.mock('@/shared/contracts/session', () => ({ getSessionToken: jest.fn() }));
jest.mock('@/lib/ipc/metrics', () => ({ recordMetric: jest.fn() }));
jest.mock('@/lib/logging', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/logging/types', () => ({
  LogDomain: { API: 'api' },
  CorrelationContext: {
    set: jest.fn(),
    getCurrentId: jest.fn(() => null),
    generateNew: jest.fn(() => 'corr-golden-task-details'),
  },
}));

import { safeInvoke } from '@/lib/ipc/utils';
import {
  mockSuccess,
  mockValidationError,
  mockNotFoundError,
  MOCK_TASK_DETAILS,
  MOCK_TASK_LIST,
  MOCK_TASK_HISTORY,
  MOCK_INTERVENTION,
} from '../utils/mock-ipc';

const { invoke: mockInvoke } = jest.requireMock('@tauri-apps/api/core') as {
  invoke: jest.Mock;
};
const { getSessionToken } = jest.requireMock(
  '@/shared/contracts/session',
) as { getSessionToken: jest.Mock };

describe('Golden Flow – Task Details & List', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSessionToken.mockResolvedValue('golden-session-token');
  });

  // ─── 1. Get task details (success) ────────────────────────────────

  it('retrieves full task details by ID', async () => {
    mockInvoke.mockResolvedValueOnce(mockSuccess(MOCK_TASK_DETAILS));

    const result = await safeInvoke('task_crud', {
      request: { action: { action: 'Get', id: 'task-golden-1' } },
    });

    expect(result).toEqual(MOCK_TASK_DETAILS);
    expect(result).toHaveProperty('vehicle_model', 'Model 3');
    expect(result).toHaveProperty('ppf_zones');
  });

  // ─── 2. Get task (not found) ──────────────────────────────────────

  it('throws NOT_FOUND for non-existent task', async () => {
    mockInvoke.mockResolvedValueOnce(
      mockNotFoundError('Task not found'),
    );

    await expect(
      safeInvoke('task_crud', {
        request: { action: { action: 'Get', id: 'nonexistent-id' } },
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  // ─── 3. List tasks ────────────────────────────────────────────────

  it('lists tasks and returns an array', async () => {
    mockInvoke.mockResolvedValueOnce(mockSuccess(MOCK_TASK_LIST));

    const result = await safeInvoke('task_crud', {
      request: { action: { action: 'List', filters: { status: 'pending' } } },
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('id', 'task-golden-1');
    expect(result[1]).toHaveProperty('status', 'in_progress');
  });

  // ─── 4. Task statistics ───────────────────────────────────────────

  it('retrieves task statistics', async () => {
    const stats = { total: 42, pending: 10, in_progress: 20, completed: 12, overdue: 0 };
    mockInvoke.mockResolvedValueOnce(mockSuccess(stats));

    const result = await safeInvoke('task_crud', {
      request: { action: { action: 'GetStatistics' } },
    });

    expect(result).toEqual(stats);
    expect(result).toHaveProperty('total', 42);
  });

  // ─── 5. View task history (success) ───────────────────────────────

  it('retrieves task history entries', async () => {
    mockInvoke.mockResolvedValueOnce(mockSuccess([...MOCK_TASK_HISTORY]));

    const result = await safeInvoke('get_task_history', {
      request: { task_id: 'task-golden-1' },
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('action', 'created');
    expect(result[1]).toHaveProperty('action', 'status_changed');
    expect(result[1]).toHaveProperty('old_value', 'pending');
    expect(result[1]).toHaveProperty('new_value', 'in_progress');
  });

  // ─── 6. View task history — task not found ────────────────────────

  it('throws NOT_FOUND when getting history for non-existent task', async () => {
    mockInvoke.mockResolvedValueOnce(
      mockNotFoundError('Task not found: nonexistent-task'),
    );

    await expect(
      safeInvoke('get_task_history', {
        request: { task_id: 'nonexistent-task' },
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  // ─── 7. Start intervention (success) ──────────────────────────────

  it('starts an intervention for a task', async () => {
    mockInvoke.mockResolvedValueOnce(mockSuccess(MOCK_INTERVENTION));

    const result = await safeInvoke('intervention_start', {
      task_id: 'task-golden-1',
      intervention_type: 'ppf',
      priority: 'medium',
      description: 'PPF installation on hood and fenders',
      estimated_duration_minutes: 360,
    });

    expect(result).toEqual(MOCK_INTERVENTION);
    expect(result).toHaveProperty('task_id', 'task-golden-1');
    expect(result).toHaveProperty('status', 'in_progress');
    const calledArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
    expect(calledArgs.session_token).toBe('golden-session-token');
  });

  // ─── 8. Start intervention — validation error ─────────────────────

  it('throws validation error when intervention_type is missing', async () => {
    mockInvoke.mockResolvedValueOnce(
      mockValidationError('intervention_type is required'),
    );

    await expect(
      safeInvoke('intervention_start', {
        task_id: 'task-golden-1',
        intervention_type: '',
        priority: 'medium',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});

