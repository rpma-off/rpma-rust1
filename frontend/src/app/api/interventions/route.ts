 /**
 * API Route: GET /api/interventions
 * Liste et recherche d'interventions PPF avec filtres
 * @version 2.0
 * @date 2025-01-20
 */

 import { NextRequest, NextResponse } from 'next/server';

 export const dynamic = 'force-dynamic';
import { z } from 'zod';
import { interventionWorkflowService } from '@/domains/interventions/server';
import { PPFInterventionStatus } from '@/types/enums';
import { handleApiError } from '@/lib/api-error';
import { ApiResponseFactory, HttpStatus } from '@/lib/http-status';

// SchÃ©ma de validation pour les paramÃ¨tres de requÃªte
const QueryParamsSchema = z.object({
  // Pagination
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  
  // Filtres
  status: z.nativeEnum(PPFInterventionStatus).optional(),
  technician_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  
  // Recherche
  search: z.string().optional(),
  
  // Tri
  sort_by: z.enum(['created_at', 'updated_at', 'scheduled_start', 'actual_start', 'progress_percentage']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  
  // Inclusions
  include_steps: z.coerce.boolean().default(false),
  include_metrics: z.coerce.boolean().default(false)
});

export async function GET(request: NextRequest) {
  try {
    // 1. Validation de l'autorisation
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(ApiResponseFactory.error(
        'Authorization header required',
        HttpStatus.UNAUTHORIZED
      ), { status: HttpStatus.UNAUTHORIZED });
    }

    // 2. Parsing et validation des paramÃ¨tres de requÃªte
    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams.entries());
    
    const validationResult = QueryParamsSchema.safeParse(rawParams);
    if (!validationResult.success) {
      return NextResponse.json(ApiResponseFactory.validationError(
        'Invalid query parameters',
        'VALIDATION_ERROR'
      ), { status: HttpStatus.UNPROCESSABLE_ENTITY });
    }

    const params = validationResult.data;

    // 3. Use InterventionWorkflowService to get interventions
    const result = await interventionWorkflowService.getInterventions({
      page: params.page,
      limit: params.limit,
      status: params.status,
      technician_id: params.technician_id,
      date_from: params.date_from,
      date_to: params.date_to,
      search: params.search,
      sort_by: params.sort_by,
      sort_order: params.sort_order,
      include_steps: params.include_steps,
      include_metrics: params.include_metrics
    });

    if (!result.success || !result.data) {
      console.error('[API] Error fetching interventions:', result.error);
      return NextResponse.json(ApiResponseFactory.error(
         (result.error as Error)?.message || 'Failed to fetch interventions',
        HttpStatus.INTERNAL_SERVER_ERROR
      ), { status: HttpStatus.INTERNAL_SERVER_ERROR });
    }

    // 4. Return the response with filters applied information
    return NextResponse.json(ApiResponseFactory.success(
      {
        data: result.data.data,
        pagination: result.data.pagination,
        filters_applied: {
          status: params.status,
          technician_id: params.technician_id,
          date_range: params.date_from || params.date_to ? {
            from: params.date_from,
            to: params.date_to
          } : null,
          search: params.search
        }
      }
    ), { status: HttpStatus.OK });

  } catch (error) {
    return handleApiError(error, 'interventions-list');
  }
}


// Gestion des autres mÃ©thodes HTTP
export async function POST() {
  return NextResponse.json(ApiResponseFactory.error(
    'Method not allowed. Interventions are created via direct IPC calls.',
    HttpStatus.METHOD_NOT_ALLOWED
  ), { status: HttpStatus.METHOD_NOT_ALLOWED });
}

export async function PUT() {
  return NextResponse.json(ApiResponseFactory.error(
    'Method not allowed',
    HttpStatus.METHOD_NOT_ALLOWED
  ), { status: HttpStatus.METHOD_NOT_ALLOWED });
}

export async function DELETE() {
  return NextResponse.json(ApiResponseFactory.error(
    'Method not allowed',
    HttpStatus.METHOD_NOT_ALLOWED
  ), { status: HttpStatus.METHOD_NOT_ALLOWED });
}

