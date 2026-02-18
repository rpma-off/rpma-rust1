 import { NextRequest, NextResponse } from 'next/server';
 
 import { configurationService } from '@/domains/admin/server';
 import { getAuthenticatedUser } from '@/lib/api-auth';

 export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/configuration/history
 * Get configuration change history
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const configurationType = searchParams.get('type') || undefined;
    const configurationId = searchParams.get('id') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    const result = await configurationService.getConfigurationHistory(
      configurationType,
      configurationId,
      limit
    );

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data);

  } catch (error) {
    console.error('Error in GET /api/admin/configuration/history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

