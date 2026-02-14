import { NextResponse } from 'next/server';
import { withAuth, NextRequestWithUser } from '@/lib/middleware/auth.middleware';
import { z } from 'zod';
import { userService } from '@/lib/services/entities/user.service';

// Zod schema for the request body
const UpdateRoleBodySchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'manager', 'technician', 'viewer']),
});

// PUT /api/admin/update-role - Update a user's role (admin only)
export const PUT = withAuth(async (request: NextRequestWithUser) => {
  const user = request.user;
  try {
    const body = await request.json();
    const validation = UpdateRoleBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body', details: validation.error.flatten() }, { status: 400 });
    }

    const { userId, role } = validation.data;

    // Ensure the user being updated is not the current user
    if (userId === user.id) {
      return NextResponse.json({ error: 'Admins cannot change their own role.' }, { status: 403 });
    }

    const result = await userService.updateUserRole(userId, role);

    if (!result.success) {
      console.error('Error updating role:', result.error);
      return NextResponse.json({ error: 'Failed to update role', details: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Role updated successfully.', data: result.data });

  } catch (error) {
    console.error('Error in update-role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, 'admin');
