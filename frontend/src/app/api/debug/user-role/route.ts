import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database.types';

export async function GET() {
  try {
    const supabaseClient = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check technicians table (main user profile table)
    const { data: userProfile, error: userError } = await supabaseClient
      .from('technicians')
      .select('role, email, first_name, last_name')
      .eq('user_id', user.id)
      .single();

    // Check technicians table again for consistency (no separate profiles table)
    const { data: profileData, error: profileError } = await supabaseClient
      .from('technicians')
      .select('role, email, first_name, last_name')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        userEmail: user.email,
        usersTable: {
          data: userProfile,
          error: userError ? (userError as { message?: string }).message : undefined
        },
        profilesTable: {
          data: profileData,
          error: profileError ? (profileError as { message?: string }).message : undefined
        },
        hasAdminAccess: ((userProfile && (userProfile as Database['public']['Tables']['technicians']['Row']).role && ((userProfile as Database['public']['Tables']['technicians']['Row']).role === 'admin' || (userProfile as Database['public']['Tables']['technicians']['Row']).role === 'manager')) ||
                         (profileData && (profileData as Database['public']['Tables']['technicians']['Row']).role && ((profileData as Database['public']['Tables']['technicians']['Row']).role === 'admin' || (profileData as Database['public']['Tables']['technicians']['Row']).role === 'manager'))),
        userProfile: userProfile,
        profileData: profileData
      }
    });

  } catch (error) {
    console.error('Error checking user role:', error);
    return NextResponse.json(
      { error: 'Failed to check user role' },
      { status: 500 }
    );
  }
}
