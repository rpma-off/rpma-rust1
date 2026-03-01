/**
 * Golden Flow: Task Management
 *
 * Tests the task lifecycle through the IPC layer:
 *   1. Create task (success + validation error)
 *   2. List tasks
 *   3. session_token auto-injection for protected commands
 *   4. AppError mapping (validation, not-found)
 *   5. correlation_id round-trip
 */

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));
jest.mock('@/domains/auth', () => ({ getSessionToken: jest.fn() }));
jest.mock('@/lib/ipc/metrics', () => ({ recordMetric: jest.fn() }));
jest.mock('@/lib/logging', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/logging/types', () => ({
  LogDomain: { API: 'api' },
  CorrelationContext: {
    set: jest.fn(),
    getCurrentId: jest.fn(() => null),
    generateNew: jest.fn(() => 'corr-golden-task'),
  },
}));

import { safeInvoke } from '@/lib/ipc/utils';
import {
  mockSuccess,
  mockValidationError,
  mockNotFoundError,
  MOCK_TASK,
} from '../utils/mock-ipc';

const { invoke: mockInvoke } = jest.requireMock('@tauri-apps/api/core') as {
  invoke: jest.Mock;
};
const { getSessionToken } = jest.requireMock(
  '@/domains/auth',
) as { getSessionToken: jest.Mock };

describe('Golden Flow – Task Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: user is authenticated
    getSessionToken.mockResolvedValue('golden-session-token');
  });

  // ─── 1. Create task (success) ─────────────────────────────────────

  it('creates a task and receives the created record', async () => {
    mockInvoke.mockResolvedValueOnce(mockSuccess(MOCK_TASK, 'corr-t1'));

    const result = await safeInvoke('task_crud', {
      request: {
        action: {
          action: 'Create',
          data: {
            title: 'Golden Flow Task',
            client_id: 'client-golden-1',
            ppf_zone: 'ZONE-001',
          },
        },
      },
    });

    expect(result).toEqual(MOCK_TASK);

    // Verify session_token was auto-injected
    const calledArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
    expect(calledArgs.session_token).toBe('golden-session-token');
  });

  // ─── 2. Create task (validation error) ────────────────────────────

  it('throws on validation error with correct code', async () => {
    mockInvoke.mockResolvedValueOnce(
      mockValidationError('Title is required'),
    );

    await expect(
      safeInvoke('task_crud', {
        request: { action: { action: 'Create', data: { title: '' } } },
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  // ─── 3. Get task (not found) ──────────────────────────────────────

  it('throws NOT_FOUND when task does not exist', async () => {
    mockInvoke.mockResolvedValueOnce(
      mockNotFoundError('Task not found'),
    );

    await expect(
      safeInvoke('task_crud', {
        request: { action: { action: 'Get', id: 'nonexistent' } },
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  // ─── 4. List tasks (success) ──────────────────────────────────────

  it('lists tasks and returns array data', async () => {
    const taskList = [MOCK_TASK, { ...MOCK_TASK, id: 'task-golden-2', title: 'Second Task' }];
    mockInvoke.mockResolvedValueOnce(mockSuccess(taskList));

    const result = await safeInvoke('task_crud', {
      request: { action: { action: 'List' } },
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(MOCK_TASK);
  });

  // ─── 5. session_token auto-injection ──────────────────────────────

  it('auto-injects session_token for task_crud (protected)', async () => {
    mockInvoke.mockResolvedValueOnce(mockSuccess(MOCK_TASK));

    await safeInvoke('task_crud', { request: { action: { action: 'Get', id: '1' } } });

    expect(getSessionToken).toHaveBeenCalled();
    const calledArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
    expect(calledArgs.session_token).toBe('golden-session-token');
  });

  // ─── 6. Missing session rejects before invoke ─────────────────────

  it('rejects when session token is missing', async () => {
    getSessionToken.mockResolvedValueOnce(null);

    await expect(
      safeInvoke('task_crud', { request: { action: { action: 'List' } } }),
    ).rejects.toMatchObject({ code: 'AUTHENTICATION' });

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  // ─── 7. correlation_id is forwarded ───────────────────────────────

  it('forwards correlation_id to the backend', async () => {
    mockInvoke.mockResolvedValueOnce(mockSuccess(MOCK_TASK));

    await safeInvoke('task_crud', {
      request: { action: { action: 'Get', id: '1' } },
    });

    const calledArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
    expect(calledArgs).toHaveProperty('correlation_id');
    expect(typeof calledArgs.correlation_id).toBe('string');
  });

  // ─── 8. Explicit session_token not overwritten ────────────────────

  it('preserves an explicitly provided session_token', async () => {
    mockInvoke.mockResolvedValueOnce(mockSuccess(MOCK_TASK));

    await safeInvoke('task_crud', {
      request: { action: { action: 'Get', id: '1' } },
      session_token: 'explicit-tok',
    });

    expect(getSessionToken).not.toHaveBeenCalled();
    const calledArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
    expect(calledArgs.session_token).toBe('explicit-tok');
  });
});
