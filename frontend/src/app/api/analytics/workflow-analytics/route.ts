import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { withMethod } from '@/lib/api-route-wrapper';
import { handleApiError } from '@/lib/api-error';
import { analyticsService } from '@/domains/analytics/server';
import { userService } from '@/domains/users/server';

/**
 * GET /api/analytics/workflow-analytics
 * Get workflow analytics
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

    // Get workflow analytics
    const result = await analyticsService.getWorkflowAnalytics();

    if (result.error) {
      return NextResponse.json(
        { error: typeof result.error === 'string' ? result.error : 'Failed to get workflow analytics' },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      analytics: result.data
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

