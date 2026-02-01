import { NextRequest } from 'next/server';
import { signOut } from '@/lib/auth';
import { createLogger, LogContext } from '@/lib/logger';
import { validateCSRFRequest } from '@/lib/auth/csrf';

const logger = createLogger('AuthSignout');

export async function POST(request: NextRequest) {
  // CSRF protection validation
  if (!await validateCSRFRequest(request)) {
    logger.warn(LogContext.AUTH, 'CSRF validation failed during signout attempt');
    return new Response(
      JSON.stringify({ error: 'Invalid request', code: 'CSRF_ERROR' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }
  try {
    logger.info(LogContext.AUTH, 'User sign out requested');

    const result = await signOut();

    if (!result.ok) {
      logger.error(LogContext.AUTH, 'Sign out failed', { error: 'Sign out failed' });
      return new Response(
        JSON.stringify({
          error: 'Failed to sign out',
          code: 'SIGNOUT_FAILED'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    logger.info(LogContext.AUTH, 'User signed out successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Signed out successfully'
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logger.error(LogContext.AUTH, 'Unexpected error during signout', { error });
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error during sign out',
        code: 'INTERNAL_ERROR'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}