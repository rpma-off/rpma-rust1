 import { NextRequest, NextResponse } from 'next/server';
 import { userService } from '@/lib/services/entities/user.service';
 import { withAuth, AuthenticatedUser } from '@/lib/middleware/auth.middleware';
 import { z } from 'zod';

 export const dynamic = 'force-dynamic';

// Zod schema for GET query parameters
const GetUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(['admin', 'manager', 'technician', 'viewer']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Zod schema for POST request body
const CreateUserBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string(),
  role: z.enum(['admin', 'manager', 'technician', 'viewer']),
});

// GET /api/admin/users - Get all users (admin only)
export const GET = withAuth(async (request: NextRequest, _context?: unknown) => {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    const validation = GetUsersQuerySchema.safeParse(query);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: validation.error.flatten() }, { status: 400 });
    }

    const result = await userService.getUsers(validation.data);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, {
      status: 200,
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/admin/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, 'admin');

// POST /api/admin/users - Create new user (admin only)
export const POST = withAuth(async (request: NextRequest, _context?: unknown) => {
  try {
    const body = await request.json();
    const validation = CreateUserBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body', details: validation.error.flatten() }, { status: 400 });
    }

    const { email, password, full_name, role } = validation.data;

    // Split full_name into first_name and last_name
    const nameParts = full_name.trim().split(/\s+/);
    if (nameParts.length < 2) {
      return NextResponse.json({ error: 'Full name must include both first and last name', code: 'INVALID_NAME' }, { status: 400 });
    }
    const first_name = nameParts[0];
    const last_name = nameParts.slice(1).join(' ');

    const result = await userService.createUser({ email, password, first_name, last_name, role });
    
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(
      { message: 'User created successfully', user: result.data },
      { status: 201 }
    );

  } catch (error) {
    console.error('Unexpected error in POST /api/admin/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, 'admin');
