 import { NextRequest, NextResponse } from 'next/server';
 import { configurationService } from '@/lib/services/entities/configuration.service';
 import { BusinessRuleFiltersData } from '@/lib/services/core/schemas';
 import { getAuthenticatedUser } from '@/lib/api-auth';

 export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/business-rules
 * Get all business rules with optional filtering
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters: Partial<BusinessRuleFiltersData> = {
      // Set defaults for required fields
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      sortBy: (searchParams.get('sortBy') as 'priority' | 'category' | 'name' | 'createdAt') || 'priority',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    };

    if (searchParams.get('category')) {
      filters.category = searchParams.get('category') as 'task_assignment' | 'validation' | 'notification';
    }
    if (searchParams.get('isActive')) {
      filters.isActive = searchParams.get('isActive') === 'true';
    }
    if (searchParams.get('priority')) {
      filters.priority = searchParams.get('priority') as 'low' | 'medium' | 'high' | 'all';
    }
    if (searchParams.get('search')) {
      filters.search = searchParams.get('search')!;
    }

    const result = await configurationService.getBusinessRules(filters as BusinessRuleFiltersData);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data);

  } catch (error) {
    console.error('Error in GET /api/admin/business-rules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/business-rules
 * Create a new business rule
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const result = await configurationService.createBusinessRule(body);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data, { status: result.status });

  } catch (error) {
    console.error('Error in POST /api/admin/business-rules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
