import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { Database } from '@/types/database.types';

type _SecurityPolicy = Database['public']['Tables']['security_policies']['Row'];
type _User = Database['public']['Tables']['users']['Row'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string  }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: policy, error } = await supabase
      .from('security_policies')
      .select('*')
      .eq('id', (await params).id)
      .single();

    if (error) {
      console.error('Error fetching security policy:', error);
      return NextResponse.json({ error: 'Security policy not found' }, { status: 404 });
    }

    return NextResponse.json(policy);
  } catch (error) {
    console.error('Error in security policy GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string  }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: policy, error } = await supabase
      .from('security_policies')
      .select('*')
      .eq('id', (await params).id)
      .single();

    if (error) {
      console.error('Error updating security policy:', error);
      return NextResponse.json({ error: 'Failed to update security policy' }, { status: 500 });
    }

    return NextResponse.json(policy);
  } catch (error) {
    console.error('Error in security policy PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string  }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('security_policies')
      .delete()
      .eq('id', (await params).id);

    if (error) {
      console.error('Error deleting security policy:', error);
      return NextResponse.json({ error: 'Failed to delete security policy' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Security policy deleted successfully' });
  } catch (error) {
    console.error('Error in security policy DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
