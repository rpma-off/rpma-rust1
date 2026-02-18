 /**
 * API Route: GET /api/interventions/[id]/steps
 * RÃ©cupÃ¨re les Ã©tapes d'une intervention PPF
 * @version 2.0
 * @date 2025-01-20
 */

 import { NextRequest, NextResponse } from 'next/server';

 export const dynamic = 'force-dynamic';
import { interventionWorkflowService } from '@/domains/interventions/server';



export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 1. Validation des paramÃ¨tres de route
    const interventionId = (await params).id;
    if (!interventionId) {
      return NextResponse.json(
        { error: 'Intervention ID required' },
        { status: 400 }
      );
    }

    // 2. Validation de l'autorisation (optionnelle pour contourner les problÃ¨mes de cookies)
    const authHeader = request.headers.get('authorization');
    console.log('[API] interventions/[id]/steps - Auth check:', { hasAuthHeader: !!authHeader });

    const sessionToken = authHeader ? authHeader.replace('Bearer ', '') : '';

    // 3. Appel du service mÃ©tier pour rÃ©cupÃ©rer les Ã©tapes
    const result = await interventionWorkflowService.getInterventionSteps(interventionId, sessionToken);

    if (!result.success) {
      console.error('[API] interventions/[id]/steps - Service error:', result.error?.message);
      return NextResponse.json(
        {
          error: result.error?.message || 'Failed to load intervention steps',
          code: 'SERVICE_ERROR'
        },
        { status: 500 }
      );
    }

    // 4. Retour de la rÃ©ponse de succÃ¨s
    return NextResponse.json(
      {
        success: true,
        data: result.data || []
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[API] Error loading intervention steps:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// Gestion des autres mÃ©thodes HTTP
export async function POST() {
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

