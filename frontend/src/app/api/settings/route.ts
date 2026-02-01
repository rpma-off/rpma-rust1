 import { NextRequest, NextResponse } from 'next/server';
 import { settingsService } from '@/lib/services/entities/settings.service';
 import { withAuth, NextRequestWithUser } from '@/lib/middleware/auth.middleware';
 import { UserSettings, UserPreferences, NotificationSettings, AccessibilitySettings, PerformanceSettings } from '@/types/settings.types';

 export const dynamic = 'force-dynamic';

// GET /api/settings - Get all user settings
export const GET = withAuth(async (request: NextRequestWithUser, context: unknown) => {
  const { user, token } = request;
  try {
    const result = await settingsService.getUserSettings(user.id, token);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to get settings' },
        { status: 500 }
      );
    }
    return NextResponse.json({ settings: result.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get settings' },
      { status: 500 }
    );
  }
}, 'all');

// PUT /api/settings - Update user settings (bulk update)
export const PUT = withAuth(async (request: NextRequestWithUser, context: unknown) => {
  const { user, token } = request;
  try {
    const body = await request.json();
    const { preferences, notifications, accessibility, performance } = body;

    const results: Array<{
      type: string;
      success: boolean;
      error?: string;
      data?: UserSettings | UserPreferences | NotificationSettings | AccessibilitySettings | PerformanceSettings;
    }> = [];

    // Update preferences if provided
    if (preferences) {
      try {
        const result = await settingsService.updatePreferences(user.id, preferences);
        if (result.success) {
          results.push({
            type: 'preferences',
            success: true,
            data: result.data
          });
        } else {
          results.push({
            type: 'preferences',
            success: false,
            error: result.error || 'Update failed'
          });
        }
      } catch (error) {
        results.push({
          type: 'preferences',
          success: false,
          error: error instanceof Error ? error.message : 'Update failed'
        });
      }
    }

    // Update notifications if provided
    if (notifications) {
      try {
        const result = await settingsService.updateNotifications(user.id, notifications, token);
        if (result.success) {
          results.push({
            type: 'notifications',
            success: true,
            data: result.data
          });
        } else {
          results.push({
            type: 'notifications',
            success: false,
            error: result.error || 'Update failed'
          });
        }
      } catch (error) {
        results.push({
          type: 'notifications',
          success: false,
          error: error instanceof Error ? error.message : 'Update failed'
        });
      }
    }

    // Update accessibility if provided
    if (accessibility) {
      try {
        const result = await settingsService.updateAccessibility(user.id, accessibility);
        if (result.success) {
          results.push({
            type: 'accessibility',
            success: true,
            data: result.data
          });
        } else {
          results.push({
            type: 'accessibility',
            success: false,
            error: result.error || 'Update failed'
          });
        }
      } catch (error) {
        results.push({
          type: 'accessibility',
          success: false,
          error: error instanceof Error ? error.message : 'Update failed'
        });
      }
    }

    // Update performance if provided
    if (performance) {
      try {
        const result = await settingsService.updatePerformance(user.id, performance);
        if (result.success) {
          results.push({
            type: 'performance',
            success: true,
            data: result.data
          });
        } else {
          results.push({
            type: 'performance',
            success: false,
            error: result.error || 'Update failed'
          });
        }
      } catch (error) {
        results.push({
          type: 'performance',
          success: false,
          error: error instanceof Error ? error.message : 'Update failed'
        });
      }
    }

    // Check if any updates failed
    const failedUpdates = results.filter(result => !result.success);
    if (failedUpdates.length > 0) {
      return NextResponse.json(
        {
          error: 'Some updates failed',
          details: failedUpdates
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Settings updated successfully',
      results
    });
  } catch (error) {
    console.error('Error in PUT /api/settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, 'all');
