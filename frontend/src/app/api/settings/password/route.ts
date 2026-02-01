import { NextRequest, NextResponse } from 'next/server';
import { settingsService } from '@/lib/services/entities/settings.service';
import { withAuth, NextRequestWithUser } from '@/lib/middleware/auth.middleware';

// PUT /api/settings/password - Change user password
export const PUT = withAuth(async (request: NextRequestWithUser) => {
  const { user } = request;
  try {
    const body = await request.json();

    await settingsService.changePassword(user.id, body);

    return NextResponse.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error in PUT /api/settings/password:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, 'all');
