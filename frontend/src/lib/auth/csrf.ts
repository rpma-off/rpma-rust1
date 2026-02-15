// CSRF protection utilities

import { randomBytes } from 'crypto';

export const generateCSRFToken = (): string => {
  // In browser environment, use crypto.getRandomValues
  if (typeof window !== 'undefined') {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Fallback for server
  return randomBytes(32).toString('hex');
};

export const createCSRFToken = generateCSRFToken;

export const validateCSRFToken = (token: string, _secret: string): boolean => {
  // Simple validation - in production, use proper CSRF validation
  return token.length === 64; // 32 bytes in hex
};

export const getCSRFCookieOptions = () => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 3600, // 1 hour
  };
};

export const validateCSRFRequest = async (request: Request): Promise<boolean> => {
  // Simple CSRF validation - in production, implement proper validation
  const token = request.headers.get(CSRF_TOKEN_HEADER);
  return !!token && token.length > 0;
};

export const CSRF_TOKEN_COOKIE = 'csrf-token';
export const CSRF_TOKEN_HEADER = 'x-csrf-token';