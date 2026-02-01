import { NextRequest, NextResponse } from 'next/server';
import { configurationService } from '@/lib/services/entities/configuration.service';
import { getAuthenticatedUser } from '@/lib/api-auth';

/**
 * GET /api/admin/configuration/[id]
 * Get a specific system configuration by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{id: string}> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin/manager role from user metadata
    const userRole = user.user_metadata?.role as string;
    if (!userRole || !['admin', 'manager'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    const result = await configurationService.getSystemConfigurationById(id);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data);

  } catch (error) {
    console.error('Error in GET /api/admin/configuration/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/configuration/[id]
 * Update a specific system configuration
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{id: string}> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role from user metadata
    const userRole = user.user_metadata?.role as string;
    if (!userRole || userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = await configurationService.updateSystemConfiguration(id, body);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data);

  } catch (error) {
    console.error('Error in PUT /api/admin/configuration/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/configuration/[id]
 * Delete a specific system configuration
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{id: string}> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role from user metadata
    const userRole = user.user_metadata?.role as string;
    if (!userRole || userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    const result = await configurationService.deleteSystemConfiguration(id);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return new NextResponse(null, { status: result.status });

  } catch (error) {
    console.error('Error in DELETE /api/admin/configuration/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
