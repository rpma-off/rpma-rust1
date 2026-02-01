 import { NextRequest, NextResponse } from 'next/server';
 import { configurationService } from '@/lib/services/entities/configuration.service';
 import { withAuth } from '@/lib/middleware/auth.middleware';
 import { ConfigurationFiltersData } from '@/lib/services/core/schemas';

 export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/configuration
 * Get all system configurations with optional filtering
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters: Partial<ConfigurationFiltersData> = {
      // Set defaults for required fields
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      sortBy: (searchParams.get('sortBy') as 'key' | 'category' | 'lastModified' | 'modifiedBy') || 'key',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc'
    };

    if (searchParams.get('category')) {
      filters.category = searchParams.get('category') as 'general' | 'security' | 'performance' | 'notifications' | 'integrations';
    }
    if (searchParams.get('type')) {
      filters.type = searchParams.get('type') as 'string' | 'number' | 'boolean' | 'object' | 'array';
    }
    if (searchParams.get('isRequired')) {
      filters.isRequired = searchParams.get('isRequired') === 'true';
    }
    if (searchParams.get('isEncrypted')) {
      filters.isEncrypted = searchParams.get('isEncrypted') === 'true';
    }
    if (searchParams.get('search')) {
      filters.search = searchParams.get('search')!;
    }

    const response = await configurationService.getSystemConfigurations(filters as ConfigurationFiltersData);

    if (response.error) {
      return NextResponse.json(
        { error: response.error },
        { status: response.status }
      );
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error in GET /api/admin/configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, 'admin');

/**
 * POST /api/admin/configuration
 * Create a new system configuration
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const response = await configurationService.createSystemConfiguration(body);

    if (response.error) {
      return NextResponse.json(
        { error: response.error },
        { status: response.status }
      );
    }

    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    console.error('Error in POST /api/admin/configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, 'admin');
