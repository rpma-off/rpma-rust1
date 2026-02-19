import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { withMethod } from '@/lib/api-route-wrapper';
import { handleApiError } from '@/lib/api-error';
import { analyticsService } from '@/domains/analytics/server';
import { userService } from '@/domains/users/server';

/**
 * GET /api/analytics/system-health
 * Get real-time system health metrics
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleGet(_request: NextRequest, _context?: unknown) {
  try {
    // Verify user has admin or manager permissions
    const authResult = await userService.verifyAdminOrManagerAccess();
    if (authResult.error) {
      return NextResponse.json(
        { error: typeof authResult.error === 'string' ? authResult.error : 'Authentication failed' },
        { status: authResult.status }
      );
    }

    // Get system health metrics
    const result = await analyticsService.getSystemHealthMetrics();

    if (result.error) {
      return NextResponse.json(
        { error: typeof result.error === 'string' ? result.error : 'Failed to get system health metrics' },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      metrics: result.data
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

