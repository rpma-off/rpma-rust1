// API error handler utilities

import { NextResponse } from 'next/server';

export const handleApiError = (error: unknown, defaultMessage: string = 'Internal server error') => {
  console.error('API Error:', error);

  const err = error as { message?: string; statusCode?: number; status?: number };
  const message = error instanceof Error ? error.message : err.message || defaultMessage;
  const status = err.statusCode || err.status || 500;

  return NextResponse.json(
    { error: message },
    { status }
  );
};

export const createErrorResponse = (message: string, status: number = 500) => {
  return NextResponse.json(
    { error: message },
    { status }
  );
};