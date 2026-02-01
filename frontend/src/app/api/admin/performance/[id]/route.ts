// TODO: This route references performance_configs table which doesn't exist in the database schema
// Uncomment when the performance_configs table is added to the database
/*
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database.types';
import { getAuthenticatedUser } from '@/lib/api-auth';

type PerformanceConfigUpdate = Database['public']['Tables']['performance_configs']['Update'];
type User = Database['public']['Tables']['users']['Row'];

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
    const { data: config, error } = await supabase
      .from('performance_configs')
      .select()
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching performance config:', error);
      return NextResponse.json({ error: 'Performance config not found' }, { status: 404 });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error in performance config GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const updateData: PerformanceConfigUpdate = {};

    // Only update provided fields
    if (body.category !== undefined) updateData.category = body.category;
    if (body.settings !== undefined) updateData.settings = body.settings;
    if (body.thresholds !== undefined) updateData.thresholds = body.thresholds;
    if (body.monitoring !== undefined) updateData.monitoring = body.monitoring;
    if (body.alerts !== undefined) updateData.alerts = body.alerts;
    if (body.isActive !== undefined) updateData.is_active = body.isActive;

    // Always update timestamp
    updateData.updated_at = new Date().toISOString();

    const { id } = await params;
    const { data: config, error } = await supabase
      .from('performance_configs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating performance config:', error);
      return NextResponse.json({ error: 'Failed to update performance config' }, { status: 500 });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error in performance config PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
      .from('performance_configs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting performance config:', error);
      return NextResponse.json({ error: 'Failed to delete performance config' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Performance config deleted successfully' });
  } catch (error) {
    console.error('Error in performance config DELETE:', error);
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
