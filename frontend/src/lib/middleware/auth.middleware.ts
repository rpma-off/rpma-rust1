// Auth middleware for API routes

import { NextRequest, NextResponse } from 'next/server';
import { ipcClient } from '@/lib/ipc';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export type NextRequestWithUser = NextRequest & { user: AuthenticatedUser; token: string };

export const authenticateRequest = async (request: NextRequest): Promise<AuthenticatedUser | null> => {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);

    // Validate the token with Tauri backend
    const response = await ipcClient.auth.validateSession(token) as any;

    // Check if validation was successful
    if (response && typeof response === 'object' && 'success' in response && response.success) {
      const session = response.data;
      if (session && typeof session === 'object' && 'user_id' in session) {
        return {
          id: session.user_id as string,
          email: session.email as string || '',
          role: session.role as string || 'viewer',
          first_name: session.first_name as string || '',
          last_name: session.last_name as string || '',
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Token validation failed:', error);
    return null;
  }
};

export const requireAuth = (handler: (request: NextRequestWithUser, context?: unknown) => Promise<NextResponse> | NextResponse, requiredRole?: string) => {
  return async (request: NextRequest, context?: unknown) => {
    const user = await authenticateRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';

    (request as NextRequestWithUser).user = user;
    (request as NextRequestWithUser).token = token;
    return handler(request as NextRequestWithUser, context);
  };
};

export const requireAdmin = (handler: (request: NextRequest, context?: unknown) => Promise<NextResponse> | NextResponse) => {
  return requireAuth(handler, 'admin');
};

export const withAuth = requireAuth;