 /**
 * API Route: POST /api/interventions/[id]/advance
 * Avance d'une étape dans le workflow d'intervention PPF
 * @version 2.0
 * @date 2025-01-20
 */


 import { NextResponse } from 'next/server';

 export const dynamic = 'force-dynamic';
import { z } from 'zod';
import { interventionWorkflowService } from '@/lib/services/ppf';
import type { AdvanceStepDTO } from '@/types/ppf-intervention';
import { handleApiError } from '@/lib/api-error';
import { ApiResponseFactory, HttpStatus } from '@/lib/http-status';

// Schéma de validation pour avancer une étape - redéfini pour éviter le bug
const AdvanceStepSchema = z.object({
  stepNumber: z.number().int().min(1, 'Step number must be at least 1').max(4, 'Step number must be at most 4'),
  data: z.record(z.string(), z.unknown()).optional(),
  measurements: z.record(z.string(), z.number()).optional(),
  observations: z.array(z.string()).optional(),
  photo_urls: z.array(z.string().url()).optional(),
  force_validation: z.boolean().optional(),
  supervisor_override: z.boolean().optional(),
  current_location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().min(-180).max(180),
    timestamp: z.string().datetime()
  }).optional(),
  notes: z.string().optional()
});



export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 1. Validation des paramètres de route
    const interventionId = (await params).id;
    if (!interventionId) {
      return NextResponse.json(ApiResponseFactory.error(
        'Intervention ID is required',
        HttpStatus.BAD_REQUEST
      ));
    }

    // Validation UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(interventionId)) {
      return NextResponse.json(ApiResponseFactory.error(
        'Invalid intervention ID format',
        HttpStatus.BAD_REQUEST
      ));
    }

    // 2. Validation du corps de la requête
    const body = await request.json();

    // Vérification de sécurité pour le schéma Zod
    if (!AdvanceStepSchema || typeof AdvanceStepSchema.safeParse !== 'function') {
      console.error('[API] CRITICAL: AdvanceStepSchema is not properly defined!');
      return NextResponse.json(ApiResponseFactory.error(
        'Schema validation configuration error',
        HttpStatus.INTERNAL_SERVER_ERROR
      ));
    }

    const validationResult = AdvanceStepSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(ApiResponseFactory.validationError(
        'Validation failed for request body',
        'VALIDATION_ERROR'
      ));
    }

    const dto: AdvanceStepDTO = {
      interventionId: interventionId,
      ...validationResult.data,
      data: validationResult.data.data as Record<string, string | number | boolean | unknown[]> | undefined
    };

    // 3. Validation de l'autorisation
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(ApiResponseFactory.error(
        'Authorization header required',
        HttpStatus.UNAUTHORIZED
      ));
    }

    const sessionToken = authHeader.replace('Bearer ', '');

    // 4. Validation de l'existence de l'intervention
    const workflowService = interventionWorkflowService;
    const interventionCheck = await workflowService.getInterventionById(interventionId, sessionToken);
    
    if (!interventionCheck.success) {
      return NextResponse.json(ApiResponseFactory.error(
        'Intervention not found',
        HttpStatus.NOT_FOUND
      ));
    }

    // 5. Validation des permissions sur l'intervention
    // TODO: Vérifier que l'utilisateur peut modifier cette intervention

    // 6. Validation des données métier spécifiques à l'étape
    const stepValidation = await validateStepSpecificData(dto.stepNumber, dto.data);
    if (!stepValidation.valid) {
      return NextResponse.json(ApiResponseFactory.error(
        'Step-specific validation failed',
        HttpStatus.UNPROCESSABLE_ENTITY
      ));
    }

    // 7. Appel du service métier
    const result = await workflowService.advanceStep(interventionId, dto, '');

    if (!result.success) {
      return NextResponse.json(ApiResponseFactory.error(
        result.error?.message || 'Failed to advance step',
        HttpStatus.BAD_REQUEST
      ));
    }

    // 8. Retour de la réponse de succès
    return NextResponse.json(
      ApiResponseFactory.success(result.data),
      { status: HttpStatus.OK }
    );

  } catch (error) {
    return handleApiError(error, 'intervention-advance-step');
  }
}

/**
 * Validation spécifique aux données de chaque étape
 * Note: La validation détaillée est gérée par le PPFValidationService
 * Cette fonction ne fait que des vérifications de base
 */
async function validateStepSpecificData(
  stepNumber: number,
  collectedData?: Record<string, unknown>
): Promise<{ valid: boolean; errors?: string[] }> {
  const errors: string[] = [];

  // Basic validation only - detailed validation is done in PPFValidationService
  if (stepNumber < 1 || stepNumber > 4) {
    errors.push(`Invalid step number: ${stepNumber}`);
  }

  // Ensure collected_data exists and is an object
  if (collectedData && typeof collectedData !== 'object') {
    errors.push('collected_data must be an object');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

// Gestion des autres méthodes HTTP
export async function GET() {
  return NextResponse.json(ApiResponseFactory.error(
    'Method not allowed',
    HttpStatus.METHOD_NOT_ALLOWED
  ));
}

export async function PUT() {
  return NextResponse.json(ApiResponseFactory.error(
    'Method not allowed',
    HttpStatus.METHOD_NOT_ALLOWED
  ));
}

export async function DELETE() {
  return NextResponse.json(ApiResponseFactory.error(
    'Method not allowed',
    HttpStatus.METHOD_NOT_ALLOWED
  ));
}