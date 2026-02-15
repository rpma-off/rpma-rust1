 /**
 * API Route: POST /api/interventions/[id]/validate
 * Validates intervention data and steps for PPF workflow compliance
 * @version 2.0
 * @date 2025-01-20
 */

 import { NextResponse } from 'next/server';

 export const dynamic = 'force-dynamic';
import { interventionWorkflowService } from '@/lib/services/ppf';
import { PPFPhotoService, PPFPhoto } from '@/lib/services/ppf/photo.service';
import { PPFInterventionData } from '@/types/ppf-intervention';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
  details: {
    dataValidation: boolean;
    stepValidation: boolean;
    photoValidation: boolean;
    complianceValidation: boolean;
  };
}

interface ValidationRequest {
  validateSteps?: boolean;
  validatePhotos?: boolean;
  validateCompliance?: boolean;
  strictMode?: boolean;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // 2. Validation de l'autorisation
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const sessionToken = authHeader.replace('Bearer ', '');

    // 3. Parsing du corps de la requête
    let validationOptions: ValidationRequest = {};
    try {
      validationOptions = await request.json();
    } catch {
      // Use default validation options if body is empty
      validationOptions = {
        validateSteps: true,
        validatePhotos: true,
        validateCompliance: true,
        strictMode: false
      };
    }

    // 4. Récupération de l'intervention
    const workflowService = interventionWorkflowService;
    const interventionResult = await workflowService.getInterventionById(interventionId, sessionToken);

    if (!interventionResult.success) {
      return NextResponse.json(
        {
          error: 'Intervention not found',
          code: 'INTERVENTION_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const intervention = interventionResult.data!;

    // 5. Validation des données de base
    const validationResult: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      score: 100,
      details: {
        dataValidation: true,
        stepValidation: true,
        photoValidation: true,
        complianceValidation: true
      }
    };

    // Validation des données de base de l'intervention
    const interventionData: PPFInterventionData = {
      ...intervention,
      currentStep: intervention.currentStep ?? 0,
      createdAt: intervention.createdAt ?? new Date().toISOString(),
      updatedAt: intervention.updatedAt ?? new Date().toISOString(),
    };
    const dataValidation = await validateInterventionData(interventionData);
    validationResult.details.dataValidation = dataValidation.isValid;
    validationResult.errors.push(...dataValidation.errors);
    validationResult.warnings.push(...dataValidation.warnings);
    validationResult.score -= dataValidation.errors.length * 20;

      // Validation des étapes si demandée
     if (validationOptions.validateSteps) {
       const stepsResult = await workflowService.getInterventionSteps(interventionId, sessionToken);
       if (stepsResult.success) {
          const steps = (stepsResult.data?.data || []) as unknown as Record<string, unknown>[];
         const stepValidation = await validateInterventionSteps(steps);
       validationResult.details.stepValidation = stepValidation.isValid;
       validationResult.errors.push(...stepValidation.errors);
       validationResult.warnings.push(...stepValidation.warnings);
       validationResult.score -= stepValidation.errors.length * 15;
     }
   }

    // Validation des photos si demandée
    if (validationOptions.validatePhotos) {
      const photoService = new PPFPhotoService();
      const photoValidation = await validateInterventionPhotos(photoService, interventionId);
      validationResult.details.photoValidation = photoValidation.isValid;
      validationResult.errors.push(...photoValidation.errors);
      validationResult.warnings.push(...photoValidation.warnings);
      validationResult.score -= photoValidation.errors.length * 10;
    }

    // Validation de conformité si demandée
     if (validationOptions.validateCompliance) {
       const complianceValidation = await validateCompliance(interventionData);
      validationResult.details.complianceValidation = complianceValidation.isValid;
      validationResult.errors.push(...complianceValidation.errors);
      validationResult.warnings.push(...complianceValidation.warnings);
      validationResult.score -= complianceValidation.errors.length * 25;
    }

    // Calcul du score final
    validationResult.score = Math.max(0, Math.min(100, validationResult.score));
    validationResult.isValid = validationResult.errors.length === 0;

    // 6. Audit logging
    console.log(`[API] Intervention validation completed: ${interventionId}`, {
      score: validationResult.score,
      errors: validationResult.errors.length,
      warnings: validationResult.warnings.length
    });

    // 7. Retour de la réponse
    return NextResponse.json(
      {
        success: true,
        data: validationResult,
        meta: {
          intervention_id: interventionId,
          validation_timestamp: new Date().toISOString(),
          validation_options: validationOptions
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[API] Error validating intervention:', error);
    return NextResponse.json(
      {
        error: 'Internal server error during validation',
        code: 'VALIDATION_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * Valide les données de base de l'intervention (tout est optionnel)
 */
async function validateInterventionData(intervention: PPFInterventionData) {
  const result = { isValid: true, errors: [] as string[], warnings: [] as string[] };

  // Aucune validation obligatoire - tout est optionnel
  // Validation des dates uniquement si elles existent
  if (intervention.created_at && intervention.updated_at) {
    const created = new Date(intervention.created_at);
    const updated = new Date(intervention.updated_at);
    if (updated < created) {
      result.errors.push('Updated date cannot be before created date');
      result.isValid = false;
    }
  }

  // Warnings pour les données manquantes (non bloquantes)
  if (!intervention.client_id) {
    result.warnings.push('Client ID is missing');
  }

  if (!intervention.technician_id) {
    result.warnings.push('Technician ID is missing');
  }

  if (!intervention.vehicle_make || !intervention.vehicle_model) {
    result.warnings.push('Vehicle information is incomplete');
  }

  if (!intervention.vehicle_year) {
    result.warnings.push('Vehicle year is missing');
  }

  if (!intervention.vehicle_vin) {
    result.warnings.push('Vehicle VIN is missing');
  }

  return result;
}

/**
 * Valide les étapes de l'intervention (toutes optionnelles)
 */
async function validateInterventionSteps(steps: Record<string, unknown>[]) {
  const result = { isValid: true, errors: [] as string[], warnings: [] as string[] };

  if (steps.length === 0) {
    result.warnings.push('No steps found for intervention');
    return result;
  }

  // Validation légère du statut des étapes (non bloquante)
  const inProgressSteps = steps.filter(step => step.status === 'in_progress');

  if (inProgressSteps.length > 1) {
    result.warnings.push('Multiple steps are in progress (not recommended)');
  }

  // Validation des données spécifiques aux étapes (warnings uniquement)
  for (const step of steps) {
    if (!step.stepType) {
      result.warnings.push(`Step ${step.id} is missing stepType`);
    }

    if (step.status === 'completed' && !step.completedAt) {
      result.warnings.push(`Completed step ${step.stepType} is missing completion timestamp`);
    }
  }

  return result;
}

/**
 * Valide les photos de l'intervention (photos optionnelles)
 */
async function validateInterventionPhotos(photoService: PPFPhotoService, interventionId: string) {
  const result = { isValid: true, errors: [] as string[], warnings: [] as string[] };

  try {
    const photos = await PPFPhotoService.getPhotosForIntervention(interventionId);

    if (photos.length === 0) {
      result.warnings.push('No photos found for intervention (photos are recommended)');
      return result;
    }

    // Validation des métadonnées des photos (warnings uniquement)
    for (const photo of photos) {
      // Validation GPS pour les photos (optionnelle)
      if (!photo.gpsCoordinates) {
        result.warnings.push(`Photo ${photo.id} is missing GPS coordinates`);
      }

      // Validation de la qualité
      if (typeof photo.qualityScore === 'number' && photo.qualityScore < 70) {
        result.warnings.push(`Photo ${photo.id} has low quality score: ${photo.qualityScore}`);
      }
    }

    // Suggestions pour la couverture des angles (non bloquant)
    const suggestedAngles = ['front', 'rear', 'left', 'right'];
    const photoAngles = photos.map((p: PPFPhoto) => p.angle).filter((angle) => angle !== undefined);

    for (const angle of suggestedAngles) {
      if (!photoAngles.includes(angle)) {
        result.warnings.push(`Consider adding photos for angle: ${angle}`);
      }
    }

  } catch {
    result.warnings.push('Error during photo validation');
  }

  return result;
}

/**
 * Valide la conformité de l'intervention (validations légères)
 */
async function validateCompliance(intervention: PPFInterventionData) {
  const result = { isValid: true, errors: [] as string[], warnings: [] as string[] };

  // Validation des délais (warning uniquement)
  if (intervention.created_at) {
    const created = new Date(intervention.created_at);
    const now = new Date();
    const daysSinceCreation = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceCreation > 30) {
      result.warnings.push('Intervention has been open for more than 30 days');
    }
  }

  // Validation du statut (warning si invalide)
  const validStatuses = ['step_1_inspection', 'step_2_preparation', 'step_3_installation', 'finalizing', 'completed', 'cancelled'];
  if (intervention.status && !validStatuses.includes(intervention.status)) {
    result.warnings.push(`Unusual intervention status: ${intervention.status}`);
  }

  // Validation du progrès (warning si invalide)
  if (intervention.completion_percentage !== undefined && intervention.completion_percentage !== null) {
    if (intervention.completion_percentage < 0 || intervention.completion_percentage > 100) {
      result.warnings.push('Progress percentage should be between 0 and 100');
    }
  }

  return result;
}