import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { AuthService } from '@/domains/users/server';
import { Database } from '@/types/database.types';

type Technician = Database['public']['Tables']['technicians']['Row'];


// GET /api/admin/users/[userId]
// Get a single user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{userId: string | string[] | undefined}> }
) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request);
    if (authError || !authUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: profile, error: profileError } = await supabase
      .from('technicians')
      .select('role')
      .eq('user_id', authUser.id)
      .single() as { data: Technician | null; error: unknown | null };

    if (profileError || !profile || !profile.role || !['admin', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = await params;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const { data: user, error } = await supabase
      .from('technicians')
      .select()
      .eq('user_id', userId)
      .single();
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ user });
    
  } catch (error) {
    console.error('Error fetching user:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const status = errorMessage.includes('Unauthorized') ? 401 : 
                  errorMessage.includes('Forbidden') ? 403 : 500;
                  
    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
}

// PATCH /api/admin/users/[userId]
// Update a user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{userId: string | string[] | undefined}> }
) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request);
    if (authError || !authUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: profile, error: profileError } = await supabase
      .from('technicians')
      .select('role')
      .eq('user_id', authUser.id)
      .single() as { data: Technician | null; error: unknown | null };

    if (profileError || !profile || !profile.role || !['admin', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = await params;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const updates = await request.json();
    
    // Validate input
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Invalid update data' },
        { status: 400 }
      );
    }
    
    const { 
      email, 
      first_name, 
      last_name, 
      role, 
      is_active,
      password 
    } = updates;
    
    // Check if user exists
    const { data: existingUser, error: userError } = await supabase
      .from('technicians')
      .select('email')
      .eq('user_id', userId)
      .single() as { data: Technician | null; error: unknown | null };
      
    if (userError || !existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const profileUpdates: Partial<Database['public']['Tables']['technicians']['Update']> = {};

    // Update email if changed
    if (email && email !== existingUser.email) {
      await AuthService.updateUserEmail(userId, email);
      profileUpdates.email = email;
    }

    // Update password if provided
    if (password) {
      await AuthService.updateUserPassword(userId, password);
    }

    // Update profile fields
    if (first_name !== undefined) profileUpdates.first_name = first_name;
    if (last_name !== undefined) profileUpdates.last_name = last_name;
    if (role !== undefined) profileUpdates.role = role;
    if (is_active !== undefined) {
      profileUpdates.is_available = is_active;
      if (!is_active) {
        await AuthService.banUser(userId);
      }
    }

    // Update profile in technicians table
    if (Object.keys(profileUpdates).length > 0) { // Check if there are updates
      const { data: updatedProfile, error: profileUpdateError } = await supabase
        .from('technicians')
        .update(profileUpdates)
        .eq('user_id', userId)
        .select()
        .single();
        
      if (profileUpdateError) {
        throw new Error(`Failed to update profile: ${(profileUpdateError as { message: string }).message}`);
      }
      
      return NextResponse.json({ user: updatedProfile });
    }
    
    const { data: currentUser } = await supabase
      .from('technicians')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    return NextResponse.json({ user: currentUser });
    
  } catch (error) {
    console.error('Error updating user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
    const status = errorMessage.includes('Unauthorized') ? 401 : 
                  errorMessage.includes('Forbidden') ? 403 : 500;
                  
    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
}

// DELETE /api/admin/users/[userId]
// Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{userId: string | string[] | undefined}> }
) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser(request);
    if (authError || !authUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: profile, error: profileError } = await supabase
      .from('technicians')
      .select('role')
      .eq('user_id', authUser.id)
      .single() as { data: Technician | null; error: unknown | null };

    if (profileError || !profile || !profile.role || !['admin', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = await params;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Delete from technicians table first
    await supabase
      .from('technicians')
      .delete()
      .eq('user_id', userId);
      
    // Delete auth user
    const result = await AuthService.deleteUser(userId);
    
    if (!result.success) {
      throw new Error(`Failed to delete user account: ${result.error}`);
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error deleting user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
    const status = errorMessage.includes('Unauthorized') ? 401 : 
                  errorMessage.includes('Forbidden') ? 403 : 500;
                  
    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
}
