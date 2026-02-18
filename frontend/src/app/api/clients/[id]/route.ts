import { NextRequest, NextResponse } from 'next/server';
import { clientService } from '@/domains/clients/server';
import { handleApiError, ApiError } from '@/lib/api-error';
import { HttpStatus } from '@/lib/http-status';
import { validateApiAuth } from '@/lib/api-auth';

/**
 * GET /api/clients/[id]
 * Get a specific client by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string  }> }
) {
  try {
    // Validate authentication
    const authResult = await validateApiAuth(request, {
      requireAuth: true,
      allowedMethods: ['GET']
    });

    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required', code: 'AUTHENTICATION_ERROR' },
        { status: authResult.statusCode || HttpStatus.UNAUTHORIZED }
      );
    }

    const { id  } = await params;

    const result = await clientService.getClientById(id);

    if (!result.success) {
      const errorCode = result.error instanceof ApiError ? result.error.code : 'CLIENT_NOT_FOUND';
      return NextResponse.json(
        { error: result.error, code: errorCode },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: result.data, message: 'Client retrieved successfully' },
      { status: HttpStatus.OK }
    );

  } catch (error) {
    return handleApiError(error, 'client-get-by-id');
  }
}

/**
 * PUT /api/clients/[id]
 * Update a specific client
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string  }> }
) {
  try {
    // Validate authentication and authorization
    const authResult = await validateApiAuth(request, {
      requireAuth: true,
      allowedRoles: ['admin', 'manager'],
      allowedMethods: ['PUT'],
      sanitizeInput: true
    });

    if (!authResult.isValid || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required', code: 'AUTHENTICATION_ERROR' },
        { status: authResult.statusCode || HttpStatus.UNAUTHORIZED }
      );
    }

    const { id  } = await params;

    // Use sanitized body from auth validation (body was already read there)
    const body = authResult.sanitizedBody;

    if (!body) {
      return NextResponse.json(
        { error: 'Request body is required', code: 'MISSING_BODY' },
        { status: HttpStatus.BAD_REQUEST }
      );
    }

    const result = await clientService.updateClient(id, body, authResult.userId);

    if (!result.success) {
      const errorCode = result.error && typeof result.error === 'object' && 'code' in result.error ? 
        (result.error as ApiError).code : 'CLIENT_UPDATE_ERROR';
      return NextResponse.json(
        { error: result.error, code: errorCode },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, data: result.data, message: 'Client updated successfully' },
      { status: HttpStatus.OK }
    );

  } catch (error) {
    return handleApiError(error, 'client-update');
  }
}

/**
 * DELETE /api/clients/[id]
 * Delete a specific client
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string  }> }
) {
  try {
    // Validate authentication and authorization (admin only)
    const authResult = await validateApiAuth(request, {
      requireAuth: true,
      allowedRoles: ['admin'],
      allowedMethods: ['DELETE']
    });

    if (!authResult.isValid || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required', code: 'AUTHENTICATION_ERROR' },
        { status: authResult.statusCode || HttpStatus.UNAUTHORIZED }
      );
    }

    const { id  } = await params;
    const result = await clientService.deleteClient(id, authResult.userId);

    if (!result.success) {
      const errorCode = result.error && typeof result.error === 'object' && 'code' in result.error ? 
        (result.error as ApiError).code : 'CLIENT_DELETE_ERROR';
      return NextResponse.json(
        { error: result.error, code: errorCode },
        { status: 400 }
      );
    }

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    return handleApiError(error, 'client-delete');
  }
}

