// API Endpoint: Pause Workflow Execution
// POST /api/workflows/[id]/pause

import { NextRequest, NextResponse } from 'next/server';
import { workflowService } from '@/lib/services';
import { validateApiAuth } from '@/lib/api-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{id: string}> }
) {
  try {
    // Validate authentication and authorization
    const authResult = await validateApiAuth(request, {
      requireAuth: true,
      allowedRoles: ['admin', 'technicien', 'manager'],
      allowedMethods: ['POST'],
      sanitizeInput: true
    });

    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: authResult.statusCode || 401 }
      );
    }

    const { id: workflowId } = await params;

    // Use sanitized body from auth validation (body was already read there)
    const body = authResult.sanitizedBody as Record<string, unknown>;

    if (!body) {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      );
    }

    const { reason, notes } = body as { reason?: string; notes?: string };

    try {
      const updatedWorkflow = await workflowService.pauseWorkflow(
        workflowId,
        authResult.userId!,
        reason,
        notes
      );

      return NextResponse.json({
        data: updatedWorkflow,
        success: true,
        message: 'Workflow paused successfully'
      });

    } catch (error) {
      console.error('Error pausing workflow:', error);
      const message = error instanceof Error ? error.message : 'Failed to pause workflow';
      
      if (message.includes('not found') || message.includes('Not found')) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
      }
      
      if (message.includes('Cannot pause')) {
        return NextResponse.json({ error: message }, { status: 400 });
      }
      
      return NextResponse.json({ error: message }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in pause workflow API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
