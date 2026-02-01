 import { NextRequest, NextResponse } from 'next/server';
 import { ClientService } from '@/lib/services';
 import { CreateClientRequest } from '@/types/client.types';
import { ApiResponseFactory } from '@/lib/http-status';
import { getAuthenticatedUser } from '@/lib/api-auth';

 export const dynamic = 'force-dynamic';

interface ClientQueryParams {
  search?: string;
  customer_type?: 'individual' | 'business';
  has_tasks?: boolean;
  created_after?: string;
  created_before?: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * GET /api/clients
 * Get clients with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const { user, error } = await getAuthenticatedUser(request);
    if (error || !user) {
      return NextResponse.json(ApiResponseFactory.error(
        error || 'Unauthorized',
        401
      ), { status: 401 });
    }

    // Extract session token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(ApiResponseFactory.error(
        'No session token provided',
        401
      ), { status: 401 });
    }
    const sessionToken = authHeader.substring(7);

    // Parse query parameters
    const { searchParams } = new URL(request.url);

    const params: ClientQueryParams = {
      search: searchParams.get('search') || undefined,
      customer_type: searchParams.get('customer_type') as 'individual' | 'business' || undefined,
      has_tasks: searchParams.get('has_tasks') === 'true' || undefined,
      created_after: searchParams.get('created_after') || undefined,
      created_before: searchParams.get('created_before') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    };

    // Get clients
    const filters = {
      search: params.search,
      page: params.page,
      limit: params.pageSize,
      sort_by: params.sortBy,
      sort_order: params.sortOrder,
      customer_type: params.customer_type,
      has_tasks: params.has_tasks,
      created_after: params.created_after,
      created_before: params.created_before
    };

    const result = await ClientService.getClients(sessionToken, filters);

    return NextResponse.json(ApiResponseFactory.success(result), { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/clients
 * Create a new client
 */
export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const { user, error } = await getAuthenticatedUser(request);
    if (error || !user) {
      return NextResponse.json(ApiResponseFactory.error(
        error || 'Unauthorized',
        401
      ), { status: 401 });
    }

    const body = await request.json();

    if (!body) {
      return NextResponse.json(ApiResponseFactory.error(
        'Request body is required',
        400
      ), { status: 400 });
    }

    const client = await ClientService.createClient(body as CreateClientRequest, user.id);

    return NextResponse.json(ApiResponseFactory.success(client), { status: 201 });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
