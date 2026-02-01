import { NextRequest, NextResponse } from 'next/server';
import { settingsService } from '@/lib/services/entities/settings.service';
import { withAuth, NextRequestWithUser } from '@/lib/middleware/auth.middleware';

// POST /api/settings/reset - Reset settings to defaults
export const POST = withAuth(async (request: NextRequestWithUser) => {
  const { user } = request;
  try {
    await settingsService.resetSettings(user.id);

    return NextResponse.json({
      message: 'Settings reset to defaults successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reset settings' },
      { status: 500 }
    );
  }
}, 'all');
