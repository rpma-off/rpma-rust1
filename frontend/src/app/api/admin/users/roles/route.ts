 import { NextRequest, NextResponse } from 'next/server';
 import { createClient } from '@/lib/supabase/server';
 import { getAuthenticatedUser } from '@/lib/api-auth';

 export const dynamic = 'force-dynamic';

// GET /api/admin/users/roles
// List all available user roles
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: profile, error: profileError } = await supabase
      .from('technicians')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || !['admin', 'manager'].includes((profile as { role: string }).role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // In a real app, you might want to get these from a database table
    // or a configuration file. For now, we'll return a static list.
    const roles = [
      'manager',
      'technician',
      'supervisor'
    ];
    
    return NextResponse.json({ roles });
    
  } catch (error) {
    console.error('Error fetching roles:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const status = errorMessage.includes('Unauthorized') ? 401 : 
                  errorMessage.includes('Forbidden') ? 403 : 500;
                  
    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
}
