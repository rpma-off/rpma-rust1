import { settingsService } from '@/domains/settings/server';
import type {
  UpdateAccessibilityRequest,
  UpdateNotificationsRequest,
  UpdatePerformanceRequest,
  UpdatePreferencesRequest,
} from '@/domains/settings/server';
import { withAuth, NextRequestWithUser } from '@/lib/middleware/auth.middleware';
import { settingsError, settingsSuccess } from './_shared';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request: NextRequestWithUser) => {
  const { user, token } = request;

  const result = await settingsService.getUserSettings(user.id, token);
  if (!result.success || !result.data) {
    return settingsError(result.error || 'Failed to get settings');
  }

  return settingsSuccess({ settings: result.data });
}, 'all');

export const PUT = withAuth(async (request: NextRequestWithUser) => {
  const { user, token } = request;

  try {
    const body = await request.json();
    const { preferences, notifications, accessibility, performance } = body as Record<string, unknown>;

    const updates: Array<{ section: string; success: boolean; error?: string }> = [];

    if (preferences) {
      const result = await settingsService.updatePreferences(
        user.id,
        preferences as UpdatePreferencesRequest,
        token
      );
      updates.push({
        section: 'preferences',
        success: result.success,
        error: result.success ? undefined : result.error,
      });
    }

    if (notifications) {
      const result = await settingsService.updateNotifications(
        user.id,
        notifications as UpdateNotificationsRequest,
        token
      );
      updates.push({
        section: 'notifications',
        success: result.success,
        error: result.success ? undefined : result.error,
      });
    }

    if (accessibility) {
      const result = await settingsService.updateAccessibility(
        user.id,
        accessibility as UpdateAccessibilityRequest,
        token
      );
      updates.push({
        section: 'accessibility',
        success: result.success,
        error: result.success ? undefined : result.error,
      });
    }

    if (performance) {
      const result = await settingsService.updatePerformance(
        user.id,
        performance as UpdatePerformanceRequest,
        token
      );
      updates.push({
        section: 'performance',
        success: result.success,
        error: result.success ? undefined : result.error,
      });
    }

    const failed = updates.filter((item) => !item.success);
    if (failed.length > 0) {
      return settingsError('Some settings updates failed', 400, { updates });
    }

    const refreshed = await settingsService.getUserSettings(user.id, token);
    if (!refreshed.success || !refreshed.data) {
      return settingsError(refreshed.error || 'Settings updated but failed to reload');
    }

    return settingsSuccess({
      message: 'Settings updated successfully',
      updates,
      settings: refreshed.data,
    });
  } catch (error) {
    return settingsError(error instanceof Error ? error.message : 'Invalid request body', 400);
  }
}, 'all');

