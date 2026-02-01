 import { NextRequest, NextResponse } from 'next/server';

 export const dynamic = 'force-dynamic';

import { withMethod } from '@/lib/api-route-wrapper';
import { handleApiError } from '@/lib/api-error';
import { validateApiAuth } from '@/lib/api-auth';
import { TaskQuerySchema, CreateTaskSchema } from '@/lib/validation/api-schemas';
import { CreateTaskRequest } from '@/lib/backend';
import { ipcClient } from '@/lib/ipc';


/**
 * GET /api/tasks
 * Get tasks with filtering, sorting, and pagination
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleGet(request: NextRequest, context?: unknown) {
  try {
    // Validate authentication and authorization
    const authResult = await validateApiAuth(request, {
      requireAuth: true,
      allowedMethods: ['GET']
    });

    if (!authResult.isValid) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTHENTICATION_ERROR' },
        { status: authResult.statusCode || 401 }
      );
    }

    const url = new URL(request.url);
    const { searchParams } = url;

    // Parse and validate query parameters with Zod
    const queryValidation = TaskQuerySchema.safeParse({
      status: searchParams.get('status') || undefined,
      technician_id: searchParams.get('technician_id') || undefined,
      client_id: searchParams.get('client_id') || undefined,
      search: searchParams.get('search') || undefined,
      from_date: searchParams.get('from_date') || undefined,
      to_date: searchParams.get('to_date') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortOrder: searchParams.get('sortOrder') || 'desc'
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        { error: 'Validation failed for query parameters', code: 'VALIDATION_ERROR', details: queryValidation.error.issues },
        { status: 400 }
      );
    }
    
    // Extract session token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No session token provided', code: 'AUTHENTICATION_ERROR' },
        { status: 401 }
      );
    }
    const sessionToken = authHeader.substring(7);

    // Map API query to TaskQuery format
    const taskQuery = {
      page: Math.floor((queryValidation.data.offset || 0) / (queryValidation.data.limit || 20)) + 1,
      limit: queryValidation.data.limit || 20,
      status: queryValidation.data.status || null,
      technician_id: queryValidation.data.technician_id || null,
      client_id: queryValidation.data.client_id || null,
      priority: queryValidation.data.priority || null,
      search: queryValidation.data.search || null,
      from_date: null,
      to_date: null,
      sort_by: 'created_at',
      sort_order: 'desc' as const
    };

    // Use IPC to list tasks
    const result = await ipcClient.tasks.list(taskQuery, sessionToken);

    return NextResponse.json(
      { success: true, data: (result as { data?: unknown })?.data, pagination: (result as { pagination?: unknown })?.pagination },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/tasks
 * Create a new task using centralized service
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handlePost(request: NextRequest, context?: unknown) {
  try {
    // Validate authentication, authorization, and input
    const authResult = await validateApiAuth(request, {
      requireAuth: true,
      allowedMethods: ['POST'],
      sanitizeInput: true
    });

    if (!authResult.isValid || !authResult.userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTHENTICATION_ERROR' },
        { status: authResult.statusCode || 401 }
      );
    }

    // Use sanitized body from auth validation (body was already read there)
    if (!authResult.sanitizedBody) {
      return NextResponse.json(
        { error: 'Request body is required', code: 'MISSING_BODY' },
        { status: 400 }
      );
    }

    // Validate request body with Zod
    const bodyValidation = CreateTaskSchema.safeParse(authResult.sanitizedBody);

    if (!bodyValidation.success) {
      return NextResponse.json(
        { error: 'Validation failed for request body', code: 'VALIDATION_ERROR', details: bodyValidation.error.issues },
        { status: 400 }
      );
    }

    // Extract session token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No session token provided', code: 'AUTHENTICATION_ERROR' },
        { status: 401 }
      );
    }
    const sessionToken = authHeader.substring(7);

    // Map API data to CreateTaskRequest format
    const createTaskData: CreateTaskRequest = {
      vehicle_plate: bodyValidation.data.vehicle_plate,
      vehicle_model: bodyValidation.data.vehicle_model,
      ppf_zones: bodyValidation.data.ppf_zones,
      scheduled_date: bodyValidation.data.scheduled_date,
      external_id: bodyValidation.data.external_id || null,
      status: bodyValidation.data.status || null,
      technician_id: bodyValidation.data.technician_id || null,
      start_time: bodyValidation.data.start_time || null,
      end_time: bodyValidation.data.end_time || null,
      checklist_completed: bodyValidation.data.checklist_completed || null,
      notes: bodyValidation.data.note || null,
      title: bodyValidation.data.title || null,
      vehicle_make: bodyValidation.data.vehicle_make || null,
      vehicle_year: bodyValidation.data.vehicle_year || null,
      vin: bodyValidation.data.vin || null,
      date_rdv: bodyValidation.data.date_rdv || null,
      heure_rdv: bodyValidation.data.heure_rdv || null,
      lot_film: bodyValidation.data.lot_film || null,
      customer_name: bodyValidation.data.customer_name || null,
      customer_email: bodyValidation.data.customer_email || null,
      customer_phone: bodyValidation.data.customer_phone || null,
      customer_address: bodyValidation.data.customer_address || null,
      custom_ppf_zones: bodyValidation.data.custom_ppf_zones || null,
      template_id: bodyValidation.data.template_id || null,
      workflow_id: bodyValidation.data.workflow_id || null,
      task_number: bodyValidation.data.task_number || null,
      creator_id: bodyValidation.data.creator_id || null,
      created_by: bodyValidation.data.created_by || null,
      description: bodyValidation.data.description || null,
      priority: bodyValidation.data.priority || null,
      client_id: bodyValidation.data.client_id || null,
      estimated_duration: bodyValidation.data.estimated_duration || null,
      tags: bodyValidation.data.tags || null
    };

    // Create task using IPC
    const result = await ipcClient.tasks.create(createTaskData, sessionToken);

    return NextResponse.json(
      { success: true, data: result },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// Export the route handlers
export const GET = withMethod(['GET'])(handleGet);
export const POST = withMethod(['POST'])(handlePost);
