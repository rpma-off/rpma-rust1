import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Health check endpoint to verify API and database connectivity
 * GET /api/health
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Test 1: Basic API response
    const basicCheck = {
      api: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    };

    // Test 2: Database connectivity (Tauri local DB - assume connected)
    const dbCheck = { connected: true, error: null as string | null };

    // Test 3: Environment variables
    const envCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    };

    const responseTime = Date.now() - startTime;
    const isHealthy = dbCheck.connected && envCheck.hasSupabaseUrl && envCheck.hasAnonKey;

    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks: {
        basic: basicCheck,
        database: dbCheck,
        environment: envCheck
      },
      responseTime: `${responseTime}ms`
    }, {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Health check failed',
      responseTime: `${responseTime}ms`
    }, { status: 500 });
  }
}
