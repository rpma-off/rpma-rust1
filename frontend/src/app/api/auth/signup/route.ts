import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/services/entities/user.service';
import { createLogger, LogContext } from '@/lib/logger';
import { z } from 'zod';

const logger = createLogger('AuthSignup');

// Zod schema for the request body
const SignupBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string(),
  role: z.enum(['admin', 'manager', 'technician', 'viewer']).default('technician'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = SignupBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body', details: validation.error.flatten() }, { status: 400 });
    }

    const { email, password, full_name, role } = validation.data;

    // Split full_name into first_name and last_name
    const nameParts = full_name.trim().split(/\s+/);
    if (nameParts.length < 2) {
      return NextResponse.json({ error: 'Full name must include both first and last name', code: 'INVALID_NAME' }, { status: 400 });
    }
    const first_name = nameParts[0];
    const last_name = nameParts.slice(1).join(' ');

    logger.info(LogContext.AUTH, 'Creating new user account', { email, role, first_name, last_name });

    const result = await userService.createUser({ email, password, first_name, last_name, role });

    if (result.error) {
      logger.error(LogContext.AUTH, 'User creation failed', { error: result.error, email });
      return NextResponse.json({ error: result.error, code: 'USER_CREATION_FAILED' }, { status: result.status });
    }

    logger.info(LogContext.AUTH, 'User created successfully', { userId: result.data?.id, email });

    return NextResponse.json(
      { success: true, message: 'User created successfully', user: result.data },
      { status: 201 }
    );

  } catch (error) {
    logger.error(LogContext.AUTH, 'Unexpected error during signup', { error });
    return NextResponse.json({ error: 'Internal server error during user creation', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
