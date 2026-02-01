// TODO: This route references integration_configs table which doesn't exist in the database schema
// Uncomment when the integration_configs table is added to the database
/*
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database.types';
import { getAuthenticatedUser } from '@/lib/api-auth';

type IntegrationConfig = Database['public']['Tables']['integration_configs']['Row'];
type IntegrationConfigUpdate = Database['public']['Tables']['integration_configs']['Update'];
type User = Database['public']['Tables']['users']['Row'];
*/


/*
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{id: string}> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('users')
      .select<'role', User>('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { data: integration, error } = await supabase
      .from('integration_configs')
      .select<'*', IntegrationConfig>('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching integration:', error);
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    return NextResponse.json(integration);
  } catch (error) {
    console.error('Error in integration GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
*/

/*
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{id: string}> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('users')
      .select<'role', User>('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }



    const body = await request.json();
    const updateData: IntegrationConfigUpdate = {};

    // Only update provided fields
    if (body.name !== undefined) updateData.name = body.name;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.provider !== undefined) updateData.provider = body.provider;
    if (body.settings !== undefined) updateData.settings = body.settings;
    if (body.credentials !== undefined) updateData.credentials = body.credentials;
    if (body.isActive !== undefined) updateData.is_active = body.isActive;

    // Always update timestamp
    updateData.updated_at = new Date().toISOString();

    const { id } = await params;
    const { data: integration, error } = await supabase
      .from('integration_configs')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating integration:', error);
      return NextResponse.json({ error: 'Failed to update integration' }, { status: 500 });
    }

    return NextResponse.json(integration);
  } catch (error) {
    console.error('Error in integration PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
*/

/*
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{id: string}> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('users')
      .select<'role', User>('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { error } = await supabase
      .from('integration_configs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting integration:', error);
      return NextResponse.json({ error: 'Failed to delete integration' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Integration deleted successfully' });
  } catch (error) {
    console.error('Error in integration DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
*/

// Export placeholder functions to avoid import errors
export async function GET() {
  return Response.json({ error: 'Not implemented' }, { status: 501 });
}

export async function PUT() {
  return Response.json({ error: 'Not implemented' }, { status: 501 });
}

export async function DELETE() {
  return Response.json({ error: 'Not implemented' }, { status: 501 });
}
