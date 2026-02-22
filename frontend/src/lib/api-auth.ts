// API authentication utilities

import { jwtVerify } from 'jose';
import type { JsonObject, JsonValue } from '@/types/json';

export interface AuthenticatedRequest {
  id: string;
  email: string;
  role: string;
  username: string;
  user_metadata?: JsonObject;
}

type RequestWithAuth = Request & { auth: AuthenticatedRequest };

// JWT secret - must match the one used in Rust backend
const JWT_SECRET = process.env.JWT_SECRET;

// Reuse a single TextEncoder instance for JWT verification
const textEncoder = new TextEncoder();

interface JwtClaims {
  sub: string;        // User ID
  email: string;      // User email
  username: string;   // Username
  role: string;       // User role
  iat: number;        // Issued at
  exp: number;        // Expiration
  jti: string;        // JWT ID
  session_id: string; // Session identifier
}

export const authenticateRequest = async (request: Request): Promise<AuthenticatedRequest | null> => {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No Bearer token found');
      return null;
    }

    const token = authHeader.substring(7);
    console.log('Token length:', token.length);

    // Validate JWT token
    if (!JWT_SECRET) {
      console.error('JWT_SECRET is not defined');
      return null;
    }

    const { payload: decoded } = await jwtVerify(
      token,
      textEncoder.encode(JWT_SECRET)
    );
    const claims = decoded as unknown as JwtClaims;
    console.log('JWT decoded successfully:', { sub: claims.sub, email: claims.email, role: claims.role });

    return {
      id: claims.sub,
      email: claims.email,
      role: claims.role,
      username: claims.username,
    };
  } catch (error) {
    console.error('JWT validation error:', error);
    return null;
  }
};

export const getAuthenticatedUser = async (request: Request): Promise<{ user: AuthenticatedRequest | null; error?: string }> => {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return { user: null, error: 'Invalid or missing authentication token' };
    }
    return { user };
  } catch (error) {
    return { user: null, error: error instanceof Error ? error.message : 'Authentication failed' };
  }
};

export const requireAuth = (handler: (request: Request, context?: unknown) => Promise<Response> | Response) => {
  return async (request: Request, context?: unknown) => {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Add auth to request
    (request as RequestWithAuth).auth = auth;
    return handler(request as RequestWithAuth, context);
  };
};

export interface AuthValidationResult {
  isValid: boolean;
  user?: AuthenticatedRequest;
  userId?: string;
  userRole?: string;
  error?: string;
  statusCode?: number;
  sanitizedBody?: JsonValue | null;
}

export const validateApiAuth = async (
  request: Request,
  options?: {
    requireAuth?: boolean;
    allowedRoles?: string[];
    allowedMethods?: string[];
    sanitizeInput?: boolean;
  }
): Promise<AuthValidationResult> => {
  try {
    // Check HTTP method if specified
    if (options?.allowedMethods && !options.allowedMethods.includes(request.method)) {
      return {
        isValid: false,
        error: `Method ${request.method} not allowed`,
        statusCode: 405
      };
    }

    const user = await authenticateRequest(request);

    // Check authentication
    if (!user) {
      return {
        isValid: false,
        error: 'Unauthorized',
        statusCode: 401
      };
    }

    // Check role authorization
    if (options?.allowedRoles && !options.allowedRoles.includes(user.role)) {
      return {
        isValid: false,
        error: 'Insufficient permissions',
        statusCode: 403
      };
    }

    // Read and sanitize body if requested
    let sanitizedBody: JsonValue | null | undefined = undefined;
    if (options?.sanitizeInput && (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH')) {
      try {
        const contentType = request.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          sanitizedBody = await request.json();
        } else {
          // For other content types, just clone the request to avoid consuming it
          sanitizedBody = null;
        }
      } catch (_error) {
        return {
          isValid: false,
          error: 'Invalid request body',
          statusCode: 400
        };
      }
    }

    return {
      isValid: true,
      user,
      userId: user.id,
      userRole: user.role,
      sanitizedBody
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
      statusCode: 500
    };
  }
};

// Alias for backward compatibility
export const authenticateApiRequest = authenticateRequest;
