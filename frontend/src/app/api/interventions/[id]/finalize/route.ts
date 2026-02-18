 /**
 * API Route: POST /api/interventions/[id]/finalize
 * Finalise une intervention PPF complètement
 * @version 2.0
 * @date 2025-01-20
 */

 import { NextResponse } from 'next/server';

 export const dynamic = 'force-dynamic';
import { z } from 'zod';
import { interventionWorkflowService } from '@/domains/interventions';
import type { PPFStep } from '@/domains/interventions';

// Schéma de validation pour finaliser une intervention
const FinalizeInterventionSchema = z.object({
  // Résultats finaux
  customer_satisfaction: z.number().min(1).max(5).optional(),
  quality_score: z.number().min(0).max(100).optional(),
  final_observations: z.array(z.string()).optional(),
  
  // Photos finales (obligatoires)
  final_photo_urls: z.array(z.string().url()).min(1, 'At least one final photo is required'),
  
  // Signature client
  customer_signature: z.string().optional(),
  customer_comments: z.string().optional(),
  
   // Métriques finales
   actual_duration: z.number().min(1).optional(),
   material_usage: z.record(z.string(), z.number()).optional(),
  
  // Localisation finale
  completion_location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().min(0),
    timestamp: z.string().datetime()
  }).optional(),
  
  // Options de finalisation
  generate_certificate: z.boolean().optional().default(false),
  send_customer_notification: z.boolean().optional().default(true),
  create_warranty_record: z.boolean().optional().default(true)
});



export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 1. Validation des paramètres de route
    const interventionId = (await params).id;
    if (!interventionId) {
      return NextResponse.json(
        { error: 'Intervention ID is required' },
        { status: 400 }
      );
    }

    // Validation UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(interventionId)) {
      return NextResponse.json(
        { error: 'Invalid intervention ID format' },
        { status: 400 }
      );
    }

    // 2. Validation du corps de la requête
    const body = await request.json();
    const validationResult = FinalizeInterventionSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const dto = {
      intervention_id: interventionId,
      ...validationResult.data
    };

    // 3. Validation de l'autorisation
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const sessionToken = authHeader.replace('Bearer ', '');

    // 4. Validation de l'existence et du statut de l'intervention
    const workflowService = interventionWorkflowService;
    const interventionCheck = await workflowService.getInterventionById(interventionId, sessionToken);
    
    if (!interventionCheck.success) {
      return NextResponse.json(
        { 
          error: 'Intervention not found',
          code: 'INTERVENTION_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Vérifier que l'intervention est en status FINALIZING
    if (interventionCheck.data?.status !== 'finalizing') {
      return NextResponse.json(
        { 
          error: 'Intervention is not ready for finalization',
          current_status: interventionCheck.data?.status,
          code: 'INVALID_STATUS_FOR_FINALIZATION'
        },
        { status: 400 }
      );
    }

    // 5. Validation des permissions sur l'intervention
    // TODO: Vérifier que l'utilisateur peut finaliser cette intervention

    // 6. Validation métier de finalisation
    const finalizationValidation = await validateFinalizationRequirements(interventionId, sessionToken);
    if (!finalizationValidation.valid) {
      return NextResponse.json(
        { 
          error: 'Finalization requirements not met',
          details: finalizationValidation.errors,
          code: 'FINALIZATION_REQUIREMENTS_NOT_MET'
        },
        { status: 400 }
      );
    }

    // 7. Validation de la satisfaction client si fournie
    if (dto.customer_satisfaction && dto.customer_satisfaction < 3) {
      // Si satisfaction < 3, des commentaires sont requis
      if (!dto.customer_comments || dto.customer_comments.trim().length === 0) {
        return NextResponse.json(
          { 
            error: 'Customer comments required when satisfaction rating is below 3',
            code: 'CUSTOMER_COMMENTS_REQUIRED'
          },
          { status: 400 }
        );
      }
    }

    // 8. Appel du service métier
    const result = await workflowService.finalizeIntervention(interventionId, dto, '');

    if (!result.success) {
      return NextResponse.json(
        { 
           error: (result.error as Error)?.message || 'Failed to finalize intervention',
          code: 'INTERVENTION_FINALIZATION_FAILED'
        },
        { status: 400 }
      );
    }

    // 9. Retour de la réponse de succès avec résumé complet
    const typedData = result.data as {
      intervention: { intervention_completed_at: string };
      completion_summary: { efficiency_rating: number; quality_score: number };
      certificates?: Record<string, unknown>;
    };
    return NextResponse.json(
      {
        success: true,
        data: result.data,
        message: 'Intervention finalized successfully',
        summary: {
          intervention_id: interventionId,
          completion_time: typedData.intervention.intervention_completed_at,
          efficiency_rating: typedData.completion_summary.efficiency_rating,
          quality_score: typedData.completion_summary.quality_score,
          certificates_generated: !!typedData.certificates
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[API] Error finalizing intervention:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * Valide que l'intervention peut être finalisée
 */
async function validateFinalizationRequirements(
  interventionId: string,
  sessionToken: string
): Promise<{ valid: boolean; errors?: string[] }> {
  const errors: string[] = [];

  try {
    const workflowService = interventionWorkflowService;
    
      // Vérifier que toutes les étapes sont complétées
      const stepsResult = await workflowService.getInterventionSteps(interventionId, sessionToken);
      if (stepsResult.success && stepsResult.data) {
        const steps: PPFStep[] = stepsResult.data.data.map(step => ({
          ...step,
          stepName: step.step_name,
          step_status: step.completed_at ? 'completed' : step.started_at ? 'in_progress' : 'pending',
          status: step.completed_at ? 'completed' : step.started_at ? 'in_progress' : 'pending',
          step_number: step.step_number,
          required: step.required,
          created_at: step.started_at?.toISOString() || new Date().toISOString(),
          updated_at: step.completed_at?.toISOString() || new Date().toISOString(),
        })) || [];
        const incompleteSteps = steps.filter((step: PPFStep) =>
          step.status !== 'completed' && step.required === true
        );

        if (incompleteSteps.length > 0) {
          errors.push(`Incomplete mandatory steps: ${incompleteSteps.map((s: PPFStep) => s.stepName).join(', ')}`);
        }

         // Vérifier que chaque étape a le minimum de photos requises
         // TODO: Rewrite to fetch photos separately from PPFPhotoService
         for (const _step of steps) {
           // Temporarily skip photo validation until photos are fetched separately
           // if (step.requiresPhotos && step.minPhotosRequired) {
           //   const photoCount = await fetchPhotoCountForStep(step.id);
           //   if (photoCount < step.minPhotosRequired) {
           //     errors.push(`Step ${step.stepNumber} requires at least ${step.minPhotosRequired} photos, but only ${photoCount} provided`);
           //   }
           // }
         }
        }

    // TODO: Ajouter d'autres validations métier
    // - Vérification des signatures requises
    // - Validation de la qualité minimale
    // - Contrôle des mesures critiques
  }
  catch (error) {
    console.error('Error validating finalization requirements:', error);
    errors.push('Failed to validate finalization requirements');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

// Gestion des autres méthodes HTTP
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
