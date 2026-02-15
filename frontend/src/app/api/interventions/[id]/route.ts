 /**
 * API Route: GET /api/interventions/[id]
 * Récupère les détails complets d'une intervention PPF
 * @version 2.0
 * @date 2025-01-20
 */

 import { NextResponse } from 'next/server';

 export const dynamic = 'force-dynamic';
import { interventionWorkflowService } from '@/lib/services/ppf';
import { PPFInterventionData } from '@/types/ppf-intervention';

interface PPFPhoto {
  id: string;
  url: string;
  step_id?: string;
  timestamp: string;
  [key: string]: unknown;
}

interface PPFMetrics {
  duration_minutes?: number;
  quality_score?: number;
  [key: string]: unknown;
}

interface InterventionPermissions {
  can_advance_step: boolean;
  can_finalize: boolean;
  can_pause: boolean;
  can_cancel: boolean;
  can_add_photos: boolean;
  can_edit_data: boolean;
  requires_supervisor: boolean;
}



export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    // 3. Récupération des paramètres de requête
    const url = new URL(request.url);
    const includeSteps = url.searchParams.get('include_steps') === 'true';
    const includePhotos = url.searchParams.get('include_photos') === 'true';
    const includeMetrics = url.searchParams.get('include_metrics') === 'true';

    // 4. Appel du service métier
    const workflowService = interventionWorkflowService;

    // Récupération de l'intervention de base
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

    // 5. Enrichissement conditionnel des données
    const interventionData: PPFInterventionData = {
      ...intervention,
      currentStep: intervention.currentStep ?? 0,
      createdAt: intervention.createdAt ?? new Date().toISOString(),
      updatedAt: intervention.updatedAt ?? new Date().toISOString(),
    };
    const responseData: {
      intervention: PPFInterventionData;
      steps?: Record<string, unknown>[];
      photos?: PPFPhoto[];
      metrics?: PPFMetrics | null;
      permissions?: InterventionPermissions;
    } = {
      intervention: interventionData
    };

    // Récupération des étapes si demandées
    if (includeSteps) {
      const stepsResult = await workflowService.getInterventionSteps(interventionId, sessionToken);
      if (stepsResult.success) {
        responseData.steps = stepsResult.data?.data || [];
      }
    }

    // Récupération des photos si demandées
    if (includePhotos) {
      // TODO: Appel au service photo pour récupérer toutes les photos
      responseData.photos = [];
    }

    // Récupération des métriques si demandées
    if (includeMetrics) {
      // TODO: Appel au service métriques
      responseData.metrics = null;
    }

    // 6. Calcul des permissions d'action
    const permissions = await calculateInterventionPermissions({
      status: intervention.status,
      currentStep: intervention.currentStep
    });
    responseData.permissions = permissions;

    // 7. Retour de la réponse
    return NextResponse.json(
      {
        success: true,
        data: responseData,
        meta: {
          intervention_id: interventionId,
          current_status: intervention.status,
          progress_percentage: intervention.progress,
          currentStep: intervention.currentStep,
          last_updated: intervention.updatedAt
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[API] Error fetching intervention:', error);
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
 * Calcule les permissions d'action disponibles pour l'intervention
 */
async function calculateInterventionPermissions(intervention: { status: string; currentStep?: number | null; }) {
  const permissions = {
    can_advance_step: false,
    can_finalize: false,
    can_pause: false,
    can_cancel: false,
    can_add_photos: false,
    can_edit_data: false,
    requires_supervisor: false
  };

  switch (intervention.status) {
    case 'step_1_inspection':
    case 'step_2_preparation':
    case 'step_3_installation':
    case 'step_4_finalization':
      permissions.can_advance_step = true;
      permissions.can_pause = true;
      permissions.can_cancel = true;
      permissions.can_add_photos = true;
      permissions.can_edit_data = true;
      permissions.requires_supervisor = intervention.currentStep === 3 || intervention.currentStep === 4; // Installation and Finalization
      break;

    case 'finalizing':
      permissions.can_finalize = true;
      permissions.can_add_photos = true;
      permissions.requires_supervisor = true;
      break;

    case 'completed':
    case 'cancelled':
      // Aucune action possible
      break;

    default:
      // Status inconnu, pas d'action
      break;
  }

  return permissions;
}

// Gestion des autres méthodes HTTP
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed. Use /start to create interventions.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use specific endpoints for updates.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use /cancel to cancel interventions.' },
    { status: 405 }
  );
}