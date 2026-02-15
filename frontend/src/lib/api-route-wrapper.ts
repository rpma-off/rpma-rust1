// API route wrapper for error handling

import { NextRequest, NextResponse } from 'next/server';
import type { JsonValue } from '@/types/json';

export interface ApiResponse<T = JsonValue> {
  success: boolean;
  data?: T;
  error?: string;
}

export const apiRouteWrapper = (handler: (req: NextRequest, context?: unknown) => Promise<NextResponse>) => {
  return async (req: NextRequest, context?: unknown): Promise<NextResponse> => {
    try {
      return await handler(req, context);
    } catch (error) {
      console.error('API Route Error:', error);

      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        },
        { status: 500 }
      );
    }
  };
};

export const withMethod = (allowedMethods: string[]) => {
  return (handler: (req: NextRequest, context?: unknown) => Promise<NextResponse>) => {
    return async (req: NextRequest, context?: unknown): Promise<NextResponse> => {
      if (!allowedMethods.includes(req.method)) {
        return NextResponse.json(
          { success: false, error: `Method ${req.method} not allowed` },
          { status: 405 }
        );
      }
      return handler(req, context);
    };
  };
};

export const withAuth = (handler: (req: NextRequest, context?: unknown) => Promise<NextResponse>) => {
  return async (req: NextRequest, context?: unknown): Promise<NextResponse> => {
    // TODO: Implement authentication check
    // For now, just pass through
    return handler(req, context);
  };
};
