import { settingsService } from '@/lib/services/entities/settings.service';
import { withAuth, NextRequestWithUser } from '@/lib/middleware/auth.middleware';
import { settingsError, settingsSuccess } from '../_shared';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request: NextRequestWithUser) => {
  const { user, token } = request;
  const result = await settingsService.getUserSettings(user.id, token);

  if (!result.success || !result.data) {
    return settingsError(result.error || 'Failed to get accessibility settings');
  }

  return settingsSuccess({ accessibility: result.data.accessibility });
}, 'all');

export const PUT = withAuth(async (request: NextRequestWithUser) => {
  const { user, token } = request;

  try {
    const body = await request.json();
    const result = await settingsService.updateAccessibility(user.id, body, token);

    if (!result.success || !result.data) {
      return settingsError(result.error || 'Failed to update accessibility settings');
    }

    return settingsSuccess({
      message: 'Accessibility settings updated successfully',
      accessibility: result.data.accessibility,
    });
  } catch (error) {
    return settingsError(error instanceof Error ? error.message : 'Invalid request body', 400);
  }
}, 'all');
