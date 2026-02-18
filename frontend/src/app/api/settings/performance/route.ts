import { settingsService } from '@/domains/settings/server';
import { withAuth, NextRequestWithUser } from '@/lib/middleware/auth.middleware';
import { settingsError, settingsSuccess } from '../_shared';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request: NextRequestWithUser) => {
  const { user, token } = request;
  const result = await settingsService.getUserSettings(user.id, token);

  if (!result.success || !result.data) {
    return settingsError(result.error || 'Failed to get performance settings');
  }

  return settingsSuccess({ performance: result.data.performance });
}, 'all');

export const PUT = withAuth(async (request: NextRequestWithUser) => {
  const { user, token } = request;

  try {
    const body = await request.json();
    const result = await settingsService.updatePerformance(user.id, body, token);

    if (!result.success || !result.data) {
      return settingsError(result.error || 'Failed to update performance settings');
    }

    return settingsSuccess({
      message: 'Performance settings updated successfully',
      performance: result.data.performance,
    });
  } catch (error) {
    return settingsError(error instanceof Error ? error.message : 'Invalid request body', 400);
  }
}, 'all');

