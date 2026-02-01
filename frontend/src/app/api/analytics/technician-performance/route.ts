 import { NextResponse } from 'next/server';
 import { NextRequest } from 'next/server';
 import { withMethod } from '@/lib/api-route-wrapper';
 import { handleApiError } from '@/lib/api-error';
 import { analyticsService } from '@/lib/services/entities/analytics.service';
 import { userService } from '@/lib/services/entities/user.service';

 export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/technician-performance
 * Get technician performance analytics
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

    // Get technician ID from query parameters (optional)
    const url = new URL(request.url);
    const technicianId = url.searchParams.get('technicianId');

    // Get technician performance analytics
    const result = await analyticsService.getTechnicianPerformance(technicianId || undefined);

    if (result.error) {
      return NextResponse.json(
        { error: typeof result.error === 'string' ? result.error : 'Failed to get technician performance' },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      performance: result.data
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
