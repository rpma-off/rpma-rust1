/**
 * Golden Flow: RBAC Enforcement
 *
 * Verifies role-based access control at two layers:
 *   1. Frontend guard  — hasPermission / withPermissionCheck from @/lib/rbac
 *   2. IPC layer       — backend returns AUTHORIZATION error for under-privileged callers
 *
 * The backend is the authoritative enforcement point; the frontend checks are
 * defence-in-depth to improve UX.
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
    generateNew: jest.fn(() => 'corr-golden-rbac'),
  },
}));

import { hasPermission, withPermissionCheck } from '@/lib/rbac';
import { safeInvoke } from '@/lib/ipc/utils';
import {
  mockSuccess,
  mockAuthorizationError,
  MOCK_TASK,
} from '../utils/mock-ipc';

const { invoke: mockInvoke } = jest.requireMock('@tauri-apps/api/core') as {
  invoke: jest.Mock;
};
const { getSessionToken } = jest.requireMock(
  '@/shared/contracts/session',
) as { getSessionToken: jest.Mock };

describe('Golden Flow – RBAC Enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSessionToken.mockResolvedValue('golden-session-token');
  });

  // ── 1. Frontend permission matrix — viewer ────────────────────────

  it('viewer can read tasks', () => {
    expect(hasPermission('viewer', 'task:read')).toBe(true);
  });

  it('viewer cannot write tasks', () => {
    expect(hasPermission('viewer', 'task:write')).toBe(false);
  });

  it('viewer cannot update tasks', () => {
    expect(hasPermission('viewer', 'task:update')).toBe(false);
  });

  it('viewer cannot delete tasks', () => {
    expect(hasPermission('viewer', 'task:delete')).toBe(false);
  });

  it('viewer cannot manage users', () => {
    expect(hasPermission('viewer', 'user:write')).toBe(false);
    expect(hasPermission('viewer', 'user:delete')).toBe(false);
  });

  it('viewer cannot access settings', () => {
    expect(hasPermission('viewer', 'settings:write')).toBe(false);
  });

  // ── 2. Frontend permission matrix — admin ─────────────────────────

  it('admin can perform all task operations', () => {
    expect(hasPermission('admin', 'task:read')).toBe(true);
    expect(hasPermission('admin', 'task:write')).toBe(true);
    expect(hasPermission('admin', 'task:update')).toBe(true);
    expect(hasPermission('admin', 'task:delete')).toBe(true);
  });

  it('admin can manage users', () => {
    expect(hasPermission('admin', 'user:write')).toBe(true);
    expect(hasPermission('admin', 'user:delete')).toBe(true);
  });

  it('admin can access settings', () => {
    expect(hasPermission('admin', 'settings:write')).toBe(true);
  });

  // ── 3. Frontend permission matrix — technician ────────────────────

  it('technician can read and write tasks but not delete', () => {
    expect(hasPermission('technician', 'task:read')).toBe(true);
    expect(hasPermission('technician', 'task:write')).toBe(true);
    expect(hasPermission('technician', 'task:delete')).toBe(false);
  });

  it('technician cannot manage users', () => {
    expect(hasPermission('technician', 'user:write')).toBe(false);
    expect(hasPermission('technician', 'user:delete')).toBe(false);
  });

  // ── 4. withPermissionCheck blocks viewer before invoke ────────────

  it('withPermissionCheck blocks viewer from deleting a task', async () => {
    const viewerUser = { role: 'viewer', id: 'u1', username: 'viewer', email: 'v@test.com' };

    const outcome = await withPermissionCheck(
      viewerUser as Parameters<typeof withPermissionCheck>[0],
      'task:delete',
      async () => 'deleted',
    );

    expect(outcome.success).toBe(false);
    if (!outcome.success) {
      expect(outcome.error).toMatch(/task:delete/);
    }
    // IPC must NOT be called — frontend guard fires first
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('withPermissionCheck allows admin to delete a task', async () => {
    const adminUser = { role: 'admin', id: 'u2', username: 'admin', email: 'a@test.com' };

    const outcome = await withPermissionCheck(
      adminUser as Parameters<typeof withPermissionCheck>[0],
      'task:delete',
      async () => 'deleted',
    );

    expect(outcome.success).toBe(true);
    if (outcome.success) {
      expect(outcome.data).toBe('deleted');
    }
  });

  it('withPermissionCheck treats null user as viewer', async () => {
    const outcome = await withPermissionCheck(
      null,
      'task:write',
      async () => 'written',
    );

    expect(outcome.success).toBe(false);
    if (!outcome.success) {
      expect(outcome.error).toMatch(/viewer/);
    }
  });

  // ── 5. IPC layer — backend returns AUTHORIZATION for viewer ───────

  it('safeInvoke propagates backend AUTHORIZATION error for task transition', async () => {
    mockInvoke.mockResolvedValueOnce(mockAuthorizationError());

    await expect(
      safeInvoke('task_transition_status', {
        task_id: 'task-golden-1',
        new_status: 'in_progress',
        reason: null,
      }),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION' });
  });

  it('safeInvoke propagates backend AUTHORIZATION error for quote status change', async () => {
    mockInvoke.mockResolvedValueOnce(mockAuthorizationError());

    await expect(
      safeInvoke('quote_mark_sent', {
        request: { id: 'quote-golden-1' },
      }),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION' });
  });

  it('safeInvoke propagates backend AUTHORIZATION error for task deletion', async () => {
    mockInvoke.mockResolvedValueOnce(mockAuthorizationError());

    await expect(
      safeInvoke('task_crud', {
        request: { action: { action: 'Delete', id: 'task-golden-1' } },
      }),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION' });
  });

  // ── 6. Admin IPC calls succeed ────────────────────────────────────

  it('admin receives task data from a protected IPC call', async () => {
    mockInvoke.mockResolvedValueOnce(mockSuccess(MOCK_TASK));

    const result = await safeInvoke('task_crud', {
      request: { action: { action: 'Get', id: 'task-golden-1' } },
    });

    expect(result).toEqual(MOCK_TASK);
    const calledArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
    expect(calledArgs.session_token).toBe('golden-session-token');
  });
});
