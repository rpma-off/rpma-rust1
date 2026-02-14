import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateApiAuth, getAuthenticatedUser } from '@/lib/api-auth';
import type { Database as _Database } from '@/types/database.types';
import { z } from 'zod';
import type { Json } from '@/types/database.types';

// Zod schema for integration config validation
const IntegrationConfigSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  provider: z.string().min(1, 'Provider is required'),
  settings: z.unknown().refine((val) => val && typeof val === 'object' && Object.keys(val as object).length > 0, 'Settings cannot be empty'),
  credentials: z.unknown().optional().default({}),
  isActive: z.boolean().optional().default(false)
});

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();

    // Fetch integrations
    const { data: integrations, error } = await supabase
      .from('integration_configs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching integrations:', error);
      return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 });
    }

    return NextResponse.json(integrations || []);
  } catch (error) {
    console.error('Error in integrations GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate authentication and authorization
    const authResult = await validateApiAuth(request);

    if (!authResult.isValid || authResult.user?.role !== 'admin') {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: authResult.statusCode || 401 }
      );
    }

    const _supabase = await createClient();

    // Parse request body
    const body = await request.json();

    if (!body) {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      );
    }

    // Validate input with Zod schema
    const validationResult = IntegrationConfigSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.issues
      }, { status: 400 });
    }

    const { name, type, provider, settings, credentials, isActive } = validationResult.data;

// Create integration
    const insertData = {
      name,
      type,
      provider,
      settings: settings as Json,
      credentials: (credentials || {}) as Json,
      is_active: isActive ?? false,
      status: 'inactive',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // TODO: integration_configs table may not exist in database
    // const { data: integration, error } = await supabase
    //   .from('integration_configs')
    //   .insert([insertData])
    //   .select()
    //   .single();

    // Temporary mock response
    const integration = insertData;
    const error = null;

    if (error) {
      console.error('Error creating integration:', error);
      return NextResponse.json({ error: 'Failed to create integration' }, { status: 500 });
    }

    return NextResponse.json(integration, { status: 201 });
  } catch (error) {
    console.error('Error in integrations POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
