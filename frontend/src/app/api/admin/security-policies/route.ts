// TODO: This route references security_policies table which doesn't exist in the database schema
// Uncomment when the security_policies table is added to the database
/*
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Json, Tables } from '@/types/database.types';

export async function GET() {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile || (profile as Tables<'users'>).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch security policies
    const { data: policies, error } = await supabase
      .from('security_policies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching security policies:', error);
      return NextResponse.json({ error: 'Failed to fetch security policies' }, { status: 500 });
    }

    return NextResponse.json(policies || []);
  } catch (error) {
    console.error('Error in security policies GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
*/

/*
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile || (profile as Tables<'users'>).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, type, settings, isActive, appliesTo, exceptions }: {
      name: string;
      type: string;
      settings: Json;
      isActive?: boolean;
      appliesTo?: Json;
      exceptions?: Json;
    } = body;

    // Validate required fields
    if (!name || !type || !settings) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create security policy
    const { data: policy, error } = await supabase
      .from('security_policies')
      .insert([{
        name,
        type,
        settings: settings as Json,
        is_active: isActive ?? true,
        applies_to: (appliesTo || []) as Json,
        exceptions: (exceptions || []) as Json,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating security policy:', error);
      return NextResponse.json({ error: 'Failed to create security policy' }, { status: 500 });
    }

    return NextResponse.json(policy, { status: 201 });
  } catch (error) {
    console.error('Error in security policies POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
*/

// Export placeholder functions to avoid import errors
export async function GET() {
  return Response.json({ error: 'Not implemented' }, { status: 501 });
}

export async function POST() {
  return Response.json({ error: 'Not implemented' }, { status: 501 });
}
