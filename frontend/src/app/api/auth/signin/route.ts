import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createLogger, LogContext } from '@/lib/logger';
import { z } from 'zod';
import { addAuthDelay } from '@/lib/auth/timing-safe';

const logger = createLogger('AuthSignin');

const SigninBodySchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z.string().min(1, { message: 'Password cannot be empty' }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = SigninBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body', details: validation.error.flatten() }, { status: 400 });
    }

    const { email, password } = validation.data;
    const response = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.warn(LogContext.AUTH, 'Sign in failed', { email, error: error.message });
      await addAuthDelay(1000);
      return NextResponse.json({ error: 'Authentication failed', details: error.message }, { status: 401 });
    }

    logger.info(LogContext.AUTH, 'User signed in successfully', { email });

    // Return a success response. The cookies are set by the `set` method in the client.
    return NextResponse.json({ success: true, message: 'Signed in successfully' });

  } catch (error) {
    logger.error(LogContext.AUTH, 'Unexpected error during signin', { error: (error as Error).message });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
