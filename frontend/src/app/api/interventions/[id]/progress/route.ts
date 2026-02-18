/**
 * API Route: GET /api/interventions/[id]/progress
 * Retrieves current progress information for a PPF intervention
 * @version 2.0
 * @date 2025-01-20
 */

import { NextResponse, NextRequest } from 'next/server';
import { interventionWorkflowService } from '@/domains/interventions';
import { validateApiAuth } from '@/lib/api-auth';
import { InterventionWorkflowService } from '@/domains/interventions';
import { PPFInterventionData, PPFInterventionStep } from '@/types/ppf-intervention';

interface ProgressData {
  overall_progress: number;
  current_step: number;
  total_steps: number;
  completed_steps: number;
  remaining_steps: number;
  estimated_completion_time?: string;
  time_elapsed: string;
  time_remaining?: string;
  step_breakdown: {
    step_number: number;
    step_type: string | null;
    status: string | null;
    progress_percentage: number;
    time_spent?: string;
    photos_count: number;
    photos_required: number;
  }[];
  blockers: string[];
  recommendations: string[];
}

interface ProgressUpdateRequest {
  step_id?: string;
  progress_percentage?: number;
  notes?: string;
  force_update?: boolean;
}

export async function GET(
  req: NextRequest,
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

    // 2. Authenticate the request
    const authResult = await validateApiAuth(req);
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: 'Unauthorized', details: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    // Get session token from Authorization header
    const authHeader = req.headers.get('authorization') || '';
    const sessionToken = authHeader.replace('Bearer ', '');

    // 3. Récupération de l'intervention
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

    // Security check: Ensure the user can access this intervention
    const userId = authResult.userId;
    if (
      intervention.technicianId !== userId &&
      authResult.user?.role !== 'admin'
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to access this intervention' },
        { status: 403 }
      );
    }

    // 4. Récupération des étapes
    const stepsResult = await workflowService.getInterventionSteps(interventionId, sessionToken);
    if (!stepsResult.success) {
      return NextResponse.json(
        {
          error: 'Could not retrieve intervention steps',
          code: 'STEPS_RETRIEVAL_ERROR'
        },
        { status: 500 }
      );
    }

    const steps = (stepsResult.data?.data || []) as PPFInterventionStep[];

    // 5. Calcul des données de progrès
    const interventionData: PPFInterventionData = {
      ...intervention,
      currentStep: intervention.currentStep ?? 0,
      createdAt: intervention.createdAt ?? new Date().toISOString(),
      updatedAt: intervention.updatedAt ?? new Date().toISOString(),
    };
    const progressData = await calculateProgressData(interventionData, steps);

    // 6. Retour de la réponse
    return NextResponse.json(
      {
        success: true,
        data: progressData,
        meta: {
          intervention_id: interventionId,
          last_updated: intervention.updatedAt,
          calculation_timestamp: new Date().toISOString()
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[API] Error fetching intervention progress:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'PROGRESS_RETRIEVAL_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * API Route: PUT /api/interventions/[id]/progress
 * Updates progress information for a PPF intervention
 */
export async function PUT(
  req: NextRequest,
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

    // 2. Authenticate the request
    const authResult = await validateApiAuth(req);
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: 'Unauthorized', details: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    // Get session token from Authorization header
    const authHeader = req.headers.get('authorization') || '';
    const sessionToken = authHeader.replace('Bearer ', '');

    // 3. Parsing du corps de la requête
    const updateData: ProgressUpdateRequest = await req.json();

    if (!updateData.step_id && updateData.progress_percentage === undefined) {
      return NextResponse.json(
        { error: 'Either step_id or progress_percentage must be provided' },
        { status: 400 }
      );
    }

    // 4. Validation des données d'entrée
    if (updateData.progress_percentage !== undefined) {
      if (updateData.progress_percentage < 0 || updateData.progress_percentage > 100) {
        return NextResponse.json(
          { error: 'Progress percentage must be between 0 and 100' },
          { status: 400 }
        );
      }
    }

    // 5. Récupération de l'intervention
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

    // Security check: Ensure the user can update this intervention
    const userId = authResult.userId;
    if (
      intervention.technicianId !== userId &&
      authResult.user?.role !== 'admin'
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to update this intervention' },
        { status: 403 }
      );
    }

    // 6. Mise à jour du progrès
    const updateResult = await updateInterventionProgress(
      workflowService,
      interventionId,
      updateData
    );

    if (!updateResult.success) {
      return NextResponse.json(
        {
          error: updateResult.error || 'Failed to update progress',
          code: 'PROGRESS_UPDATE_ERROR'
        },
        { status: 500 }
      );
    }

    // 7. Récupération des données mises à jour
    const updatedInterventionResult = await workflowService.getInterventionById(interventionId, sessionToken);
    const updatedStepsResult = await workflowService.getInterventionSteps(interventionId, sessionToken);

    if (!updatedInterventionResult.success || !updatedStepsResult.success) {
      return NextResponse.json(
        {
          error: 'Could not retrieve updated progress data',
          code: 'UPDATED_DATA_RETRIEVAL_ERROR'
        },
        { status: 500 }
      );
    }

    const updatedInterventionData: PPFInterventionData = {
      ...updatedInterventionResult.data!,
      currentStep: updatedInterventionResult.data!.currentStep ?? 0,
      createdAt: updatedInterventionResult.data!.createdAt ?? new Date().toISOString(),
      updatedAt: updatedInterventionResult.data!.updatedAt ?? new Date().toISOString(),
    };
    const updatedProgressData = await calculateProgressData(
      updatedInterventionData,
      (updatedStepsResult.data?.data || []) as PPFInterventionStep[]
    );

    // 8. Audit logging
    console.log(`[API] Intervention progress updated: ${interventionId}`, {
      previous_progress: intervention.progress,
      new_progress: updatedInterventionResult.data!.progress,
      step_id: updateData.step_id,
      notes: updateData.notes
    });

    // 9. Retour de la réponse
    return NextResponse.json(
      {
        success: true,
        data: updatedProgressData,
        meta: {
          intervention_id: interventionId,
          updated_at: updatedInterventionResult.data!.updatedAt,
          update_timestamp: new Date().toISOString()
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[API] Error updating intervention progress:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'PROGRESS_UPDATE_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * Calcule les données de progrès détaillées
 */
async function calculateProgressData(intervention: PPFInterventionData, steps: PPFInterventionStep[]): Promise<ProgressData> {
  const totalSteps = steps.length;
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const currentStepIndex = steps.findIndex(step => step.status === 'in_progress');
  const currentStep = currentStepIndex >= 0 ? currentStepIndex + 1 : completedSteps + 1;

  // Calcul du progrès global
  let overallProgress = intervention.progress_percentage || 0;
  if (totalSteps > 0) {
    overallProgress = Math.max(overallProgress, (completedSteps / totalSteps) * 100);
  }

  // Calcul des temps
  const timeElapsed = calculateTimeElapsed(intervention.created_at);
  const timeRemaining = estimateTimeRemaining(steps, currentStep);

  // Analyse détaillée des étapes
  const stepBreakdown = await Promise.all(
    steps.map(async (step, index) => {
      const stepNumber = index + 1;
      const photosCount = await getStepPhotosCount(step.id);
      const photosRequired = getRequiredPhotosForStep(step.step_type ?? null);

      return {
        step_number: stepNumber,
        step_type: step.step_type ?? null,
        status: step.status ?? null,
        progress_percentage: step.status === 'completed' ? 100 :
                           step.status === 'in_progress' ? 50 : 0,
        time_spent: step.duration_seconds ? `${Math.floor(step.duration_seconds / 60)}m` : '0m',
        photos_count: photosCount,
        photos_required: photosRequired
      };
    })
  );

  // Identification des bloqueurs
  const blockers = identifyBlockers(steps, intervention);

  // Recommandations
  const recommendations = generateRecommendations(steps, intervention, blockers);

  return {
    overall_progress: Math.round(overallProgress),
    current_step: currentStep,
    total_steps: totalSteps,
    completed_steps: completedSteps,
    remaining_steps: totalSteps - completedSteps,
    estimated_completion_time: timeRemaining,
    time_elapsed: timeElapsed,
    time_remaining: timeRemaining,
    step_breakdown: stepBreakdown,
    blockers,
    recommendations
  };
}

/**
 * Met à jour le progrès de l'intervention
 */
async function updateInterventionProgress(
  workflowService: InterventionWorkflowService,
  interventionId: string,
  updateData: ProgressUpdateRequest
) {
  try {
    // Pour l'instant, on simule la mise à jour
    // TODO: Implémenter la vraie logique de mise à jour dans le service
    console.log('Updating progress for intervention:', interventionId, updateData);

    return {
      success: true,
      data: {
        intervention_id: interventionId,
        updated: true
      }
    };
  } catch (error) {
    console.error('Error updating intervention progress:', error);
    return {
      success: false,
      error: 'Failed to update progress'
    };
  }
}

/**
 * Calcule le temps écoulé depuis la création
 */
function calculateTimeElapsed(createdAt: string | null | undefined): string {
  if (!createdAt) {
    return '0m';
  }
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Estime le temps restant
 */
function estimateTimeRemaining(steps: PPFInterventionStep[], currentStep: number): string | undefined {
  const remainingSteps = steps.slice(currentStep - 1);
  const estimatedMinutes = remainingSteps.length * 45; // 45 minutes par étape moyenne

  if (estimatedMinutes === 0) return undefined;

  const hours = Math.floor(estimatedMinutes / 60);
  const minutes = estimatedMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Récupère le nombre de photos pour une étape
 */
async function getStepPhotosCount(_stepId: string): Promise<number> {
  try {
    // TODO: Implémenter la vraie logique de comptage des photos
    // Pour l'instant, on retourne un nombre fictif
    return Math.floor(Math.random() * 5);
  } catch (error) {
    console.error('Error counting step photos:', error);
    return 0;
  }
}

/**
 * Détermine le nombre de photos requis pour une étape
 */
function getRequiredPhotosForStep(stepType: string | null): number {
  if (!stepType) {
    return 4;
  }
  const requirements = {
    'inspection': 8,  // Toutes les vues + détails
    'preparation': 4, // Avant/après préparation
    'installation': 12, // Chaque étape + vérifications
    'finalization': 6   // Photos finales + documentation
  };

  return requirements[stepType as keyof typeof requirements] || 4;
}

/**
 * Identifie les bloqueurs de progrès
 */
function identifyBlockers(steps: PPFInterventionStep[], intervention: PPFInterventionData): string[] {
  const blockers: string[] = [];

  // Étapes sans photos
  const stepsWithoutPhotos = steps.filter(step => step.photo_count === 0);
  if (stepsWithoutPhotos.length > 0) {
    blockers.push(`${stepsWithoutPhotos.length} step(s) missing required photos`);
  }

  // Intervention trop ancienne
  if (intervention.created_at) {
    const created = new Date(intervention.created_at);
    const now = new Date();
    const daysOld = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld > 7) {
      blockers.push('Intervention is overdue (>7 days)');
    }
  }

  return blockers;
}

/**
 * Génère des recommandations
 */
function generateRecommendations(steps: PPFInterventionStep[], intervention: PPFInterventionData, blockers: string[]): string[] {
  const recommendations: string[] = [];

  if (blockers.length > 0) {
    recommendations.push('Address blockers to continue workflow');
  }

  // Étapes en cours depuis trop longtemps
  const longRunningSteps = steps.filter(step => {
    if (step.status === 'in_progress' && step.started_at) {
      const started = new Date(step.started_at);
      const now = new Date();
      const hoursRunning = (now.getTime() - started.getTime()) / (1000 * 60 * 60);
      return hoursRunning > 2;
    }
    return false;
  });

  if (longRunningSteps.length > 0) {
    recommendations.push('Consider pausing long-running steps for review');
  }

  // Photos manquantes
  const stepsNeedingPhotos = steps.filter(step =>
    step.status === 'in_progress' && (step.photo_count || 0) < getRequiredPhotosForStep(step.step_type || '')
  );

  if (stepsNeedingPhotos.length > 0) {
    recommendations.push('Take additional photos for current step');
  }

  return recommendations;
}
