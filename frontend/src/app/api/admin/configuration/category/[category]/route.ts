import { NextRequest, NextResponse } from 'next/server';

import { configurationService } from '@/domains/admin/server';
import { ServiceResponse } from '@/domains/admin/server';
import { SystemConfiguration } from '@/types/configuration.types';
import { getAuthenticatedUser } from '@/lib/api-auth';

/**
 * GET /api/admin/configuration/category/[category]
 * Get system configurations by category
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{category: string}> }
) {
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

    const { category } = await params;
    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    const result = await configurationService.getSystemConfigurations({
      category: category as 'general' | 'security' | 'performance' | 'notifications' | 'integrations',
      page: 1,
      pageSize: 100,
      sortBy: 'key' as 'key' | 'category' | 'lastModified' | 'modifiedBy',
      sortOrder: 'asc' as 'asc' | 'desc'
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data);

  } catch (error) {
    console.error('Error in GET /api/admin/configuration/category/[category]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/configuration/category/[category]
 * Update multiple system configurations in a category
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{category: string}> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { category } = await params;
    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { configurations } = body;

    if (!Array.isArray(configurations)) {
      return NextResponse.json(
        { error: 'Configurations must be an array' },
        { status: 400 }
      );
    }

    const results: Array<ServiceResponse<SystemConfiguration>> = [];
    for (const config of configurations) {
      if (config.id) {
        const result = await configurationService.updateSystemConfiguration(config.id, config) as ServiceResponse<SystemConfiguration>;
        results.push(result);
      }
    }

    const hasErrors = results.some(r => r.error !== null);
    if (hasErrors) {
      return NextResponse.json(
        { error: 'Some configurations failed to update', details: results },
        { status: 207 } // Multi-status
      );
    }

    return NextResponse.json({ message: 'All configurations updated successfully' });

  } catch (error) {
    console.error('Error in PUT /api/admin/configuration/category/[category]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

