import { settingsService } from '@/lib/services/entities/settings.service';
import { withAuth, NextRequestWithUser } from '@/lib/middleware/auth.middleware';
import { settingsError, settingsSuccess } from '../_shared';

export const POST = withAuth(async (request: NextRequestWithUser) => {
  const { user, token } = request;
  const result = await settingsService.exportUserData(user.id, token);

  if (!result.success || !result.data) {
    return settingsError(result.error || 'Failed to export user data');
  }

  return settingsSuccess({ export: result.data });
}, 'all');
