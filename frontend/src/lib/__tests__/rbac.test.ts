import { hasPermission, withPermissionCheck } from '@/lib/rbac';

describe('rbac frontend enforcement', () => {
  it('enforces permission checks on frontend for viewer', () => {
    expect(hasPermission('viewer', 'task:delete')).toBe(false);
    expect(hasPermission('viewer', 'task:read')).toBe(true);
  });

  it('blocks unauthorized actions before backend call', async () => {
    const result = await withPermissionCheck(
      null, // defaults to viewer
      'user:delete',
      async () => 'ok'
    );

    expect(result).toEqual({ 
      success: false, 
      error: 'Insufficient permissions. Required: user:delete, Role: viewer' 
    });
  });

  it('allows authorized actions', async () => {
    const result = await withPermissionCheck(
      { role: 'admin', id: '1', username: 'admin', email: 'admin@test.com' } as { role: string; id: string; username: string; email: string },
      'user:delete',
      async () => 'ok'
    );

    expect(result).toEqual({ success: true, data: 'ok' });
  });
});
