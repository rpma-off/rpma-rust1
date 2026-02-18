// API Endpoint: Skip Workflow Step
// POST /api/workflows/[id]/skip-step

import { NextRequest, NextResponse } from 'next/server';
import { workflowService } from '@/domains/workflow/server';
import { getAuthenticatedUser } from '@/lib/api-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{id: string}> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { id: workflowId } = await params;
    const body = await request.json();
    const { stepId, reason, notes } = body;

    if (!stepId) {
      return NextResponse.json(
        { error: 'Step ID is required' },
        { status: 400 }
      );
    }

    try {
      await workflowService.skipStep(
        stepId,
        workflowId,
        user.id,
        notes || `Step skipped: ${reason || 'No reason provided'}`
      );

      return NextResponse.json({
        success: true,
        message: 'Step skipped successfully'
      });

    } catch (error) {
      console.error('Error skipping step:', error);
      const message = error instanceof Error ? error.message : 'Failed to skip step';
      
      if (message.includes('not found') || message.includes('Not found')) {
        return NextResponse.json({ error: 'Workflow or step not found' }, { status: 404 });
      }
      
      if (message.includes('Cannot skip') || message.includes('required')) {
        return NextResponse.json({ error: message }, { status: 400 });
      }
      
      return NextResponse.json({ error: message }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in skip step API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

