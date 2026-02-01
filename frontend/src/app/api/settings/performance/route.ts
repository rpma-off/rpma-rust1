 import { NextRequest, NextResponse } from 'next/server';
 import { settingsService } from '@/lib/services/entities/settings.service';
 import { withAuth, NextRequestWithUser } from '@/lib/middleware/auth.middleware';
 import { UpdatePerformanceRequest } from '@/types/settings.types';

 export const dynamic = 'force-dynamic';

// GET /api/settings/performance - Get performance settings
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
    return NextResponse.json({ performance: result.data?.performance });
  } catch (error) {
    console.error('Error in GET /api/settings/performance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, 'all');

// PUT /api/settings/performance - Update performance settings
export const PUT = withAuth(async (request: NextRequestWithUser) => {
  const { user } = request;
  try {
    const body: UpdatePerformanceRequest = await request.json();

    const result = await settingsService.updatePerformance(user.id, body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Performance settings updated successfully'
    });
  } catch (error) {
    console.error('Error in PUT /api/settings/performance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, 'all');
