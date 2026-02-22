 import { NextRequest, NextResponse } from 'next/server';

 export const dynamic = 'force-dynamic';

import { z } from 'zod';
import { taskIpc } from '@/domains/tasks/server';
import { CreateTaskRequest, UpdateTaskRequest, TaskStatus } from '@/lib/backend';
import { ApiError } from '@/lib/api-error';
 import { withMethod } from '@/lib/api-route-wrapper';
 import { getAuthenticatedUser } from '@/lib/api-auth';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  TaskQuerySchema,
  TasksListResponseSchema,
  TaskApiResponseSchema,
  validateApiResponse,
  validateAndSanitizeInput,
  sanitizeString,
} from '@/lib/validation/api-schemas';


// Rate limiting storage (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// Rate limiting function
function checkRateLimit(ip: string, limit: number = 100, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now();

  // Clean up expired entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }

  const current = rateLimitStore.get(ip) || { count: 0, resetTime: now + windowMs };

  if (current.resetTime < now) {
    current.count = 0;
    current.resetTime = now + windowMs;
  }

  current.count++;
  rateLimitStore.set(ip, current);

  return current.count <= limit;
}

// Input validation middleware
function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    // First sanitize the input
    const sanitized = typeof data === 'object' && data !== null ?
      validateAndSanitizeInput(schema, data as Record<string, unknown>) : data;

    // Then validate with schema
    return schema.parse(sanitized);
  } catch (error) {
    if (error instanceof z.ZodError && error.issues.length > 0) {
      const firstError = error.issues[0];
      throw new ApiError(
        `Validation failed: ${firstError?.message || 'Unknown validation error'}`,
        'VALIDATION_ERROR',
        400,
        firstError?.path?.join('.') || 'unknown'
      );
    }
    throw error;
  }
}

// Logging function that respects privacy
function secureLog(level: 'info' | 'warn' | 'error', message: string, data?: unknown) {
  const timestamp = new Date().toISOString();

  if (process.env.NODE_ENV === 'development') {
    // In development, log more details but still sanitize sensitive data
    const sanitizedData = data ? sanitizeLogData(data) : undefined;
    console[level](`[${timestamp}] ${message}`, sanitizedData || '');
  } else {
    // In production, log minimal information
    console[level](`[${timestamp}] ${message}`);
  }
}

// Sanitize log data to remove sensitive information
function sanitizeLogData(data: unknown): unknown {
  if (typeof data === 'string') {
    return sanitizeString(data);
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeLogData(item));
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: Record<string, unknown> = {};
    const sensitiveFields = [
      'password', 'token', 'apikey', 'secret', 'email', 'phone',
      'address', 'customer_email', 'customer_phone', 'customer_address'
    ];

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '***';
      } else {
        sanitized[key] = sanitizeLogData(value);
      }
    }

    return sanitized;
  }

  return data;
}

// Enhanced error response with security considerations
function createErrorResponse(error: unknown, requestId: string): NextResponse {
  const timestamp = new Date().toISOString();

  if (error instanceof ApiError) {
    secureLog('warn', `Validation error [${requestId}]:`, {
      field: error.field,
      code: error.code,
    });

    return NextResponse.json({
      error: error.message,
      code: error.code,
      field: error.field,
      timestamp,
      requestId,
    }, {
      status: 400,
      headers: securityHeaders,
    });
  }

  // Log full error details securely
  const isError = error instanceof Error;
  secureLog('error', `API error [${requestId}]:`, {
    message: isError ? error.message : String(error),
    name: isError ? error.name : 'Unknown',
    // Don't log stack traces in production
    ...(process.env.NODE_ENV === 'development' && isError ? { stack: error.stack } : {}),
  });

  // Return generic error message to prevent information disclosure
  const errorObj = error as { status?: number; message?: string };
  const isServerError = !errorObj?.status || errorObj.status >= 500;
  const message = isServerError ? 'Internal server error' : (isError ? error.message : String(error));
  const status = errorObj?.status || 500;

  return NextResponse.json({
    error: message,
    code: (error as { code?: string }).code || 'SERVER_ERROR',
    timestamp,
    requestId,
  }, {
    status,
    headers: securityHeaders,
  });
}

/**
 * GET /api/tasks/validated
 * Enhanced tasks endpoint with comprehensive validation and security
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleGet(request: NextRequest, context?: unknown) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Extract client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                request.headers.get('x-real-ip') ||
                'unknown';

    // Extract session token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No session token provided', code: 'AUTHENTICATION_ERROR' },
        { status: 401 }
      );
    }
    const sessionToken = authHeader.substring(7);

    // Check rate limit
    if (!checkRateLimit(ip)) {
      secureLog('warn', `Rate limit exceeded [${requestId}]:`, { ip });
      return NextResponse.json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 900, // 15 minutes
        requestId,
      }, {
        status: 429,
        headers: {
          ...securityHeaders,
          'Retry-After': '900',
        },
      });
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams.entries());

    // Convert string values to appropriate types
    const processedParams = {
      ...rawParams,
      page: rawParams.page ? parseInt(rawParams.page, 10) : undefined,
      pageSize: rawParams.pageSize ? parseInt(rawParams.pageSize, 10) : undefined,
    };

    const validatedParams = validateInput(TaskQuerySchema, processedParams);

    secureLog('info', `Tasks query [${requestId}]:`, {
      paramCount: Object.keys(validatedParams).length,
      hasSearch: !!validatedParams.search,
      hasFilters: !!(validatedParams.status || validatedParams.technician_id),
    });

    // Use service with validated parameters
    const pageSize = validatedParams.limit || 20;
    const page = Math.floor((validatedParams.offset || 0) / pageSize) + 1;

    const result = await taskIpc.list({
      page,
      limit: pageSize,
      sort_by: 'created_at', // Default sort
      sort_order: 'desc',
      technician_id: validatedParams.technician_id || validatedParams.assigned_to || null,
      status: null,
      client_id: null,
      priority: null,
      search: null,
      from_date: null,
      to_date: null
    }, sessionToken);

    // Validate response before sending
    const taskList = (result as { data?: unknown })?.data as Record<string, unknown> | undefined;
    const taskListData = (taskList?.data ?? []) as unknown[];
    const taskListPagination = taskList?.pagination as Record<string, unknown> | undefined;
    const validatedResponse = validateApiResponse(TasksListResponseSchema, {
      data: {
        data: taskListData,
        pagination: taskListPagination ? {
          page: taskListPagination.page,
          limit: taskListPagination.limit,
          total: taskListPagination.total,
          total_pages: taskListPagination.total_pages,
        } : {
          page: 1,
          limit: 10,
          total: 0,
          total_pages: 0,
        },
      },
    });

    const duration = Date.now() - startTime;
    secureLog('info', `Tasks query completed [${requestId}]:`, {
      duration,
      resultCount: (taskListData as unknown[])?.length || 0,
      totalItems: (taskListPagination?.total as number) || 0,
      });

     return NextResponse.json((validatedResponse as { data: unknown }).data, {
       status: 200,
       headers: {
         ...securityHeaders,
         'X-Request-ID': requestId,
         'X-Response-Time': `${duration}ms`,
      },
    });

  } catch (error) {
    return createErrorResponse(error, requestId);
  }
}

/**
 * POST /api/tasks/validated
 * Enhanced task creation with comprehensive validation and security
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handlePost(request: NextRequest, context?: unknown) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authentication
    const authResult = await getAuthenticatedUser(request);

    if (!authResult.user) {
      secureLog('warn', `Unauthenticated request [${requestId}]: ${authResult.error}`);
      return NextResponse.json({
        error: authResult.error || 'Authentication required',
        code: 'UNAUTHORIZED',
        requestId,
      }, {
        status: 401,
        headers: securityHeaders,
      });
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                request.headers.get('x-real-ip') ||
                'unknown';
    if (!checkRateLimit(ip, 20)) { // Stricter limit for POST requests
      secureLog('warn', `Rate limit exceeded for POST [${requestId}]:`, { ip });
      return NextResponse.json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 900,
        requestId,
      }, {
        status: 429,
        headers: {
          ...securityHeaders,
          'Retry-After': '900',
        },
      });
    }

    // Validate Content-Type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new ApiError(
        'Invalid Content-Type. Expected application/json',
        'INVALID_CONTENT_TYPE',
        400,
        'content-type'
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(
        'Invalid JSON in request body',
        'INVALID_JSON',
        400,
        'body'
      );
    }

    // Validate against schema
    const validatedData = validateInput(CreateTaskSchema, body);

    secureLog('info', `Task creation request [${requestId}]:`, {
      hasVehicle: !!(validatedData.vehicle_make && validatedData.vehicle_model),
      hasCustomer: !!validatedData.customer_name,
      hasSchedule: !!validatedData.scheduled_date,
    });

    // Extract session token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No session token provided');
    }
    const sessionToken = authHeader.substring(7);

    // Map validated data to CreateTaskRequest format
    const createTaskData: CreateTaskRequest = {
      vehicle_plate: validatedData.vehicle_plate,
      vehicle_model: validatedData.vehicle_model,
      ppf_zones: validatedData.ppf_zones,
      scheduled_date: validatedData.scheduled_date,
      external_id: validatedData.external_id || null,
      status: validatedData.status || null,
      technician_id: validatedData.technician_id || null,
      start_time: validatedData.start_time || null,
      end_time: validatedData.end_time || null,
      checklist_completed: validatedData.checklist_completed || null,
      notes: validatedData.note || null,
      title: validatedData.title || null,
      vehicle_make: validatedData.vehicle_make || null,
      vehicle_year: validatedData.vehicle_year || null,
      vin: validatedData.vin || null,
      date_rdv: validatedData.date_rdv || null,
      heure_rdv: validatedData.heure_rdv || null,
      lot_film: validatedData.lot_film || null,
      customer_name: validatedData.customer_name || null,
      customer_email: validatedData.customer_email || null,
      customer_phone: validatedData.customer_phone || null,
      customer_address: validatedData.customer_address || null,
      custom_ppf_zones: validatedData.custom_ppf_zones || null,
      template_id: validatedData.template_id || null,
      workflow_id: validatedData.workflow_id || null,
      task_number: validatedData.task_number || null,
      creator_id: validatedData.creator_id || null,
      created_by: validatedData.created_by || null,
      description: validatedData.description || null,
      priority: validatedData.priority || null,
      client_id: validatedData.client_id || null,
      estimated_duration: validatedData.estimated_duration || null,
      tags: validatedData.tags || null
    };

    // Create task using IPC
    const task = await taskIpc.create(createTaskData, sessionToken);
    const validatedResponse = validateApiResponse(TaskApiResponseSchema, {
      data: task,
      error: null,
      success: true,
      status: 201,
    });

    const duration = Date.now() - startTime;
    secureLog('info', `Task created successfully [${requestId}]:`, {
      taskId: task?.id,
      duration,
      });

     return NextResponse.json((validatedResponse as { data: unknown }).data, {
       status: 201,
       headers: {
         ...securityHeaders,
         'X-Request-ID': requestId,
         'X-Response-Time': `${duration}ms`,
        'Location': `/api/tasks/${task?.id}`,
      },
    });

  } catch (error) {
    return createErrorResponse(error, requestId);
  }
}

/**
 * PUT /api/tasks/validated
 * Enhanced task update endpoint
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handlePut(request: NextRequest, context?: unknown) {
  const requestId = crypto.randomUUID();

  try {
    // Authentication
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.user) {
      return NextResponse.json({
        error: authResult.error || 'Authentication required',
        code: 'UNAUTHORIZED',
        requestId,
      }, { status: 401, headers: securityHeaders });
    }

    // Extract session token
    const authHeader = request.headers.get('authorization');
    const sessionToken = authHeader?.substring(7) || '';

    // Extract task ID from query or body
    const url = new URL(request.url);
    const taskId = url.searchParams.get('id');

    if (!taskId) {
      throw new ApiError(
        'Task ID is required',
        'MISSING_TASK_ID',
        400,
        'id'
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(taskId)) {
      throw new ApiError(
        'Invalid task ID format',
        'INVALID_TASK_ID',
        400,
        'id'
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = validateInput(UpdateTaskSchema, body);

    // Convert string enums to backend enum values
    const convertedData = {
      ...validatedData,
      status: validatedData.status ? (
        validatedData.status === 'pending' ? 'pending' :
        validatedData.status === 'in_progress' ? 'in_progress' :
        validatedData.status === 'completed' ? 'completed' :
        validatedData.status === 'cancelled' ? 'cancelled' :
        undefined
      ) : undefined,
      priority: validatedData.priority ? (
        validatedData.priority === 'low' ? 'low' :
        validatedData.priority === 'medium' ? 'medium' :
        validatedData.priority === 'high' ? 'high' :
        undefined
      ) : undefined,
    };

    secureLog('info', `Task update request [${requestId}]:`, {
      taskId,
      fieldsUpdated: Object.keys(validatedData).length,
    });

    // Map to UpdateTaskRequest format - include all fields with null for missing ones
    const updateData: UpdateTaskRequest = {
      id: taskId,
      title: convertedData.title || null,
      description: convertedData.description || null,
      priority: convertedData.priority as 'low' | 'medium' | 'high' | null || null,
      status: convertedData.status as TaskStatus | null || null,
      vehicle_plate: null,
      vehicle_model: null,
      vehicle_year: null,
      vehicle_make: null,
      vin: null,
      ppf_zones: null,
      custom_ppf_zones: null,
      client_id: null,
      customer_name: null,
      customer_email: null,
      customer_phone: null,
      customer_address: null,
      external_id: null,
      lot_film: null,
      checklist_completed: null,
      scheduled_date: null,
      start_time: null,
      end_time: null,
      date_rdv: null,
      heure_rdv: null,
      template_id: null,
      workflow_id: null,
      estimated_duration: null,
      notes: null,
      tags: null,
      technician_id: null
    };

    // Update task using service
    const result = await taskIpc.update(taskId, updateData, sessionToken);

    // Validate response
    const validatedResponse = validateApiResponse(TaskApiResponseSchema, {
      data: result,
      error: null,
      success: true,
      status: 200,
    });

    secureLog('info', `Task updated successfully [${requestId}]:`, {
      taskId: result?.id,
     });

     return NextResponse.json((validatedResponse as { data: unknown }).data, {
       status: 200,
       headers: {
         ...securityHeaders,
         'X-Request-ID': requestId,
       },
    });

  } catch (error) {
    return createErrorResponse(error, requestId);
  }
}

// Export route handlers with method validation and security
export const GET = withMethod(['GET'])(handleGet);
export const POST = withMethod(['POST'])(handlePost);
export const PUT = withMethod(['PUT'])(handlePut);
