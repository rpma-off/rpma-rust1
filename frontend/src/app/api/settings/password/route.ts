import { settingsService } from '@/domains/settings/server';
import { withAuth, NextRequestWithUser } from '@/lib/middleware/auth.middleware';
import { settingsError, settingsSuccess } from '../_shared';

export const PUT = withAuth(async (request: NextRequestWithUser) => {
  const { user, token } = request;

  try {
    const body = await request.json();
    const result = await settingsService.changePassword(user.id, body, token);

    if (!result.success) {
      return settingsError(result.error || 'Failed to change password', 400);
    }

    return settingsSuccess({ message: 'Password changed successfully' });
  } catch (error) {
    return settingsError(error instanceof Error ? error.message : 'Invalid request body', 400);
  }
}, 'all');

