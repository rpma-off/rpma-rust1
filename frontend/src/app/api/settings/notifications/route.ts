import { settingsService } from '@/domains/settings/server';
import { withAuth, NextRequestWithUser } from '@/lib/middleware/auth.middleware';
import { settingsError, settingsSuccess } from '../_shared';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request: NextRequestWithUser) => {
  const { user, token } = request;
  const result = await settingsService.getUserSettings(user.id, token);

  if (!result.success || !result.data) {
    return settingsError(result.error || 'Failed to get notification settings');
  }

  return settingsSuccess({ notifications: result.data.notifications });
}, 'all');

export const PUT = withAuth(async (request: NextRequestWithUser) => {
  const { user, token } = request;

  try {
    const body = await request.json();
    const result = await settingsService.updateNotifications(user.id, body, token);

    if (!result.success || !result.data) {
      return settingsError(result.error || 'Failed to update notification settings');
    }

    return settingsSuccess({
      message: 'Notification settings updated successfully',
      notifications: result.data.notifications,
    });
  } catch (error) {
    return settingsError(error instanceof Error ? error.message : 'Invalid request body', 400);
  }
}, 'all');

