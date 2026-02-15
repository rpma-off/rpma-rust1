import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { userService } from '@/lib/services/entities/user.service';
import { createLogger, LogContext } from '@/lib/logger';
import { getErrorMessage } from '@/types/utility.types';
import type { NextRequestWithUser } from '@/lib/middleware/auth.middleware';

const logger = createLogger('AuthProfileAPI');

// GET /api/auth/profile - Get current user profile
async function getHandler(request: NextRequestWithUser, _context?: unknown) {
  const user = request.user;
  try {
    logger.info(LogContext.AUTH, 'Fetching profile for user', { userId: user.id });

    const result = await userService.getUserById(user.id);

    if (result.error) {
      logger.warn(LogContext.AUTH, 'User profile not found or error fetching', { userId: user.id, error: getErrorMessage(result.error) });
      return NextResponse.json({ error: getErrorMessage(result.error) }, { status: result.status });
    }

    return NextResponse.json({ success: true, profile: result.data });

  } catch (error) {
    logger.error(LogContext.AUTH, 'Unexpected error in getHandler', { userId: user.id, error });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/auth/profile - Update current user profile
async function patchHandler(request: NextRequestWithUser, _context?: unknown) {
  const user = request.user;
  try {
    const body = await request.json();
    logger.info(LogContext.AUTH, 'Updating profile for user', { userId: user.id, updates: Object.keys(body) });

    const result = await userService.updateUser(user.id, body);

    logger.info(LogContext.AUTH, 'Profile updated successfully', { userId: user.id });
    return NextResponse.json({ success: true, profile: result });

  } catch (error) {
    logger.error(LogContext.AUTH, 'Unexpected error in patchHandler', { userId: user.id, error });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const PATCH = withAuth(patchHandler);
