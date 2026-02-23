import { hasPermission, withPermissionCheck } from '@/lib/rbac';

describe('rbac backend-authoritative mode', () => {
  it('does not block permission checks on frontend', () => {
    expect(hasPermission('viewer', 'task:delete')).toBe(true);
  });

  it('delegates authorization failures to backend responses', async () => {
    const result = await withPermissionCheck(
      null,
      'user:delete',
      async () => 'ok'
    );

    expect(result).toEqual({ success: true, data: 'ok' });
  });
});
