 import { NextRequest, NextResponse } from 'next/server';
 import { settingsService } from '@/lib/services/entities/settings.service';
 import { withAuth, NextRequestWithUser } from '@/lib/middleware/auth.middleware';

 export const dynamic = 'force-dynamic';

// GET /api/settings/preferences - Get user preferences
export const GET = withAuth(async (request: NextRequestWithUser) => {
  const { user, token } = request;
  try {
    const result = await settingsService.getUserSettings(user.id, token);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to get settings' },
        { status: 500 }
      );
    }
    return NextResponse.json({ preferences: result.data?.preferences });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get preferences' },
      { status: 500 }
    );
  }
}, 'all');

// PUT /api/settings/preferences - Update user preferences
export const PUT = withAuth(async (request: NextRequestWithUser) => {
  const { user } = request;
  try {
    const body = await request.json();

    const result = await settingsService.updatePreferences(user.id, body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Preferences updated successfully',
      preferences: result.data?.preferences
    });
  } catch (error) {
    console.error('Error in PUT /api/settings/preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, 'all');
