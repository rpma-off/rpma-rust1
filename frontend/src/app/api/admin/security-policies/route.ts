import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import type { Json } from '@/types/database.types';

function isMissingTableError(error: { code?: string; message?: string; details?: string } | null): boolean {
  if (!error) return false;
  const message = `${error.message || ''} ${error.details || ''}`.toLowerCase();
  return error.code === '42P01' || (message.includes('relation') && message.includes('security_policies'));
}

function authFailure(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request);
    if (error || !user) return authFailure(401, error || 'Unauthorized');
    if (user.role !== 'admin') return authFailure(403, 'Forbidden');

    const supabase = await createClient();
    const { data: policies, error: queryError } = await supabase
      .from('security_policies')
      .select('*')
      .order('created_at', { ascending: false });

    if (queryError) {
      if (isMissingTableError(queryError)) {
        return NextResponse.json(
          { error: 'Security policies are unavailable in this environment' },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: 'Failed to fetch security policies' }, { status: 500 });
    }

    return NextResponse.json(policies || []);
  } catch (caughtError) {
    console.error('Error in security policies GET:', caughtError);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request);
    if (error || !user) return authFailure(401, error || 'Unauthorized');
    if (user.role !== 'admin') return authFailure(403, 'Forbidden');

    const body = await request.json();
    if (!body.name || !body.type || body.settings === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, settings' },
        { status: 400 }
      );
    }

    const insertData = {
      name: body.name as string,
      type: body.type as string,
      settings: body.settings as Json,
      is_active: body.isActive === undefined ? true : Boolean(body.isActive),
      applies_to: (body.appliesTo || []) as Json,
      exceptions: (body.exceptions || []) as Json,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabase = await createClient();
    const { data: policy, error: insertError } = await supabase
      .from('security_policies')
      .insert([insertData])
      .select('*')
      .single();

    if (insertError) {
      if (isMissingTableError(insertError)) {
        return NextResponse.json(
          { error: 'Security policies are unavailable in this environment' },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: 'Failed to create security policy' }, { status: 500 });
    }

    return NextResponse.json(policy, { status: 201 });
  } catch (caughtError) {
    console.error('Error in security policies POST:', caughtError);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
