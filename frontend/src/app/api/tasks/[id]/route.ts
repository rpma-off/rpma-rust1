    import { NextRequest, NextResponse } from 'next/server';
    import { withMethod } from '@/lib/api-route-wrapper';
    import { validateApiAuth } from '@/lib/api-auth';
    import { validateCSRFRequest } from '@/lib/auth/csrf';
    import { ipcClient } from '@/lib/ipc';
    import type { UpdateTaskRequest } from '@/lib/backend';

async function handleGet(request: NextRequest, context?: unknown) {
  try {
    const params = context as { params: Promise<{ id: string }> };
    const { id } = await params.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // For GET requests, try to get token from Authorization header, but don't require it
    // since IPC handles authentication
    const authHeader = request.headers.get('Authorization');
    let sessionToken = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      sessionToken = authHeader.substring(7);
    }

    // Use IPC to get task
    const result = await ipcClient.tasks.get(id, sessionToken);

    if (result === null) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/tasks/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handlePut(request: NextRequest, context?: unknown) {
  try {
    // Validate CSRF token first
    const isValidCSRF = await validateCSRFRequest(request);
    if (!isValidCSRF) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    const params = context as { params: Promise<{ id: string }> };
    const { id } = await params.params;
    const _body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Validate authentication and authorization
    const authResult = await validateApiAuth(request, {
      requireAuth: true,
      allowedRoles: ['admin', 'manager', 'technician'],
      allowedMethods: ['PUT'],
      sanitizeInput: true
    });

    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: authResult.statusCode || 401 }
      );
    }

    // Use sanitized body from auth validation
    const updateData = authResult.sanitizedBody as Partial<UpdateTaskRequest>;

    if (!updateData || Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Update data is required' },
        { status: 400 }
      );
    }

    // Get session token for IPC
    const authHeader = request.headers.get('Authorization');
    let sessionToken = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      sessionToken = authHeader.substring(7);
    }

    // Use IPC to update task
    const result = await ipcClient.tasks.update(id, updateData as UpdateTaskRequest, sessionToken);

    return NextResponse.json(
      { success: true, data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/tasks/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handlePatch(request: NextRequest, context?: unknown) {
  try {
    const params = context as { params: Promise<{ id: string }> };
    const { id: _id } = await params.params;
    const _body = await request.json();

    // TaskService needs refactoring - return 501 for now
    return NextResponse.json({
      data: null,
      error: 'TaskService integration needed',
      success: false,
      status: 501
    }, { status: 501 });
  } catch (error) {
    console.error('Error in PATCH /api/tasks/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleDelete(request: NextRequest, context?: unknown) {
  try {
    const params = context as { params: Promise<{ id: string }> };
    const { id: _id } = await params.params;

    // TaskService needs refactoring - return 501 for now
    return NextResponse.json({
      data: null,
      error: 'TaskService integration needed',
      success: false,
      status: 501
    }, { status: 501 });
  } catch (error) {
    console.error(`[DELETE /api/tasks/[id]] Unhandled error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export route handlers
export const GET = withMethod(['GET'])(handleGet);
export const PUT = withMethod(['PUT'])(handlePut);
export const PATCH = withMethod(['PATCH'])(handlePatch);
export const DELETE = withMethod(['DELETE'])(handleDelete);
