import { NextRequest, NextResponse } from 'next/server';
import { configurationService } from '@/domains/admin/server';
import { SystemConfiguration } from '@/types/configuration.types';
import { getAuthenticatedUser } from '@/lib/api-auth';

/**
 * POST /api/admin/configuration/validate
 * Validate a system configuration
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const config: SystemConfiguration = body;

    if (!config) {
      return NextResponse.json(
        { error: 'Configuration object is required' },
        { status: 400 }
      );
    }

    const result = await configurationService.validateConfiguration(config);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in POST /api/admin/configuration/validate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

