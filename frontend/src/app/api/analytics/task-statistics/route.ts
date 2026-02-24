 import { NextResponse } from 'next/server';
 import { NextRequest } from 'next/server';
 import { withMethod } from '@/lib/api-route-wrapper';
 import { handleApiError } from '@/lib/api-error';
 import { analyticsService } from '@/domains/analytics/server';
 import { userService } from '@/domains/users/server';

 export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/task-statistics
 * Get comprehensive task statistics
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleGet(request: NextRequest, _context?: unknown) {
  try {
    // Verify user has admin or manager permissions
    const authResult = await userService.verifyAdminOrManagerAccess();
    if (authResult.error) {
      return NextResponse.json(
        { error: typeof authResult.error === 'string' ? authResult.error : 'Authentication failed' },
        { status: authResult.status }
      );
    }

    // Get time range from query parameters
    const url = new URL(request.url);
    const timeRange = url.searchParams.get('timeRange') as 'day' | 'week' | 'month' | 'year' || 'month';

    // Get task statistics
    const result = await analyticsService.getTaskStatistics('', timeRange);

    if (result.error) {
      return NextResponse.json(
        { error: typeof result.error === 'string' ? result.error : 'Failed to get task statistics' },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      stats: result.data,
      timeRange
    });

  } catch (error) {
    const apiError = handleApiError(error);
    const errorBody = await apiError.json();
    return NextResponse.json(
      { error: errorBody.message },
      { status: apiError.status }
    );
  }
}

export const GET = withMethod(['GET'])(handleGet);

