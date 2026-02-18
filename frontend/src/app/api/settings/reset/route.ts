import { settingsService } from '@/domains/settings/server';
import { withAuth, NextRequestWithUser } from '@/lib/middleware/auth.middleware';
import { settingsError, settingsSuccess } from '../_shared';

export const POST = withAuth(async (request: NextRequestWithUser) => {
  const { user, token } = request;
  const result = await settingsService.resetSettings(user.id, token);

  if (!result.success || !result.data) {
    return settingsError(result.error || 'Failed to reset settings');
  }

  return settingsSuccess({
    message: 'Settings reset to defaults successfully',
    settings: result.data,
  });
}, 'all');

