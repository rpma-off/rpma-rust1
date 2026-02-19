import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import type { Json } from '@/types/database.types';

interface PostgrestLikeError {
  code?: string;
  message?: string;
  details?: string;
}

function asPostgrestError(error: unknown): PostgrestLikeError | null {
  if (typeof error !== 'object' || error === null) return null;
  return error as PostgrestLikeError;
}

function isNotFoundError(error: unknown): boolean {
  return asPostgrestError(error)?.code === 'PGRST116';
}

function isMissingTableError(error: unknown): boolean {
  const parsed = asPostgrestError(error);
  if (!parsed) return false;
  const message = `${parsed.message || ''} ${parsed.details || ''}`.toLowerCase();
  return parsed.code === '42P01' || (message.includes('relation') && message.includes('integration_configs'));
}

function authFailure(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser(request);
    if (error || !user) return authFailure(401, error || 'Unauthorized');
    if (user.role !== 'admin') return authFailure(403, 'Forbidden');

    const { id } = await params;
    const supabase = await createClient();
    const { data: integration, error: queryError } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('id', id)
      .single();

    if (queryError) {
      if (isNotFoundError(queryError)) {
        return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
      }
      if (isMissingTableError(queryError)) {
        return NextResponse.json(
          { error: 'Integration configuration is unavailable in this environment' },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: 'Failed to fetch integration' }, { status: 500 });
    }

    return NextResponse.json(integration);
  } catch (caughtError) {
    console.error('Error in integration GET:', caughtError);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser(request);
    if (error || !user) return authFailure(401, error || 'Unauthorized');
    if (user.role !== 'admin') return authFailure(403, 'Forbidden');

    const body = await request.json();
    const updates: Record<string, Json | string | boolean> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.type !== undefined) updates.type = body.type;
    if (body.provider !== undefined) updates.provider = body.provider;
    if (body.settings !== undefined) updates.settings = body.settings as Json;
    if (body.credentials !== undefined) updates.credentials = body.credentials as Json;
    if (body.status !== undefined) updates.status = body.status;
    if (body.isActive !== undefined) updates.is_active = Boolean(body.isActive);
    updates.updated_at = new Date().toISOString();

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: 'No valid update fields provided' }, { status: 400 });
    }

    const { id } = await params;
    const supabase = await createClient();
    const { data: integration, error: updateError } = await supabase
      .from('integration_configs')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      if (isNotFoundError(updateError)) {
        return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
      }
      if (isMissingTableError(updateError)) {
        return NextResponse.json(
          { error: 'Integration configuration is unavailable in this environment' },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: 'Failed to update integration' }, { status: 500 });
    }

    return NextResponse.json(integration);
  } catch (caughtError) {
    console.error('Error in integration PUT:', caughtError);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser(request);
    if (error || !user) return authFailure(401, error || 'Unauthorized');
    if (user.role !== 'admin') return authFailure(403, 'Forbidden');

    const { id } = await params;
    const supabase = await createClient();
    const { error: deleteError } = await supabase.from('integration_configs').delete().eq('id', id);

    if (deleteError) {
      if (isMissingTableError(deleteError)) {
        return NextResponse.json(
          { error: 'Integration configuration is unavailable in this environment' },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: 'Failed to delete integration' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Integration deleted successfully' });
  } catch (caughtError) {
    console.error('Error in integration DELETE:', caughtError);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
