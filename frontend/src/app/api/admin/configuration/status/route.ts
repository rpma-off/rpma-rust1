 import { NextRequest, NextResponse } from 'next/server';
 
 import { configurationService } from '@/domains/admin/server';
 import { getAuthenticatedUser } from '@/lib/api-auth';

 export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/configuration/status
 * Get system status and health information
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'supervisor'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const result = await configurationService.getSystemStatus();

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data);

  } catch (error) {
    console.error('Error in GET /api/admin/configuration/status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

