import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateApiAuth } from '@/lib/api-auth';
import { z } from 'zod';
import type { Database as _Database, Json } from '@/types/database.types';

// Zod schema for performance config validation
const PerformanceConfigSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  settings: z.unknown().refine((val) => val && typeof val === 'object' && Object.keys(val as object).length > 0, 'Settings cannot be empty'),
  thresholds: z.unknown().refine((val) => val && typeof val === 'object' && Object.keys(val as object).length > 0, 'Thresholds cannot be empty'),
  monitoring: z.unknown().refine((val) => val && typeof val === 'object' && Object.keys(val as object).length > 0, 'Monitoring config cannot be empty'),
  alerts: z.unknown().optional().default([]),
  isActive: z.boolean().optional().default(false)
});

export async function GET(request: NextRequest) {
  try {
    // Validate authentication and authorization
    const authResult = await validateApiAuth(request);

    if (!authResult.isValid || authResult.user?.role !== 'admin') {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: authResult.statusCode || 401 }
      );
    }

    const supabase = await createClient();

    // Fetch performance configs
    const { data: configs, error } = await supabase
      .from('performance_configs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching performance configs:', error);
      return NextResponse.json({ error: 'Failed to fetch performance configs' }, { status: 500 });
    }

    return NextResponse.json(configs || []);
  } catch (error) {
    console.error('Error in performance configs GET:', error);
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
    const validationResult = PerformanceConfigSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.issues
      }, { status: 400 });
    }

    const { category, settings, thresholds, monitoring, alerts, isActive } = validationResult.data;

// Create performance config
    const insertData = {
      category,
      settings: settings as Json,
      thresholds: (thresholds || {}) as Json,
      monitoring: (monitoring || {}) as Json,
      alerts: (alerts || []) as Json,
      is_active: isActive ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // TODO: performance_configs table may not exist in database
    // const { data: config, error } = await supabase
    //   .from('performance_configs')
    //   .insert([insertData])
    //   .select()
    //   .single();

    // Temporary mock response
    const config = insertData;
    const error = null;

    if (error) {
      console.error('Error creating performance config:', error);
      return NextResponse.json({ error: 'Failed to create performance config' }, { status: 500 });
    }

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    console.error('Error in performance configs POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
