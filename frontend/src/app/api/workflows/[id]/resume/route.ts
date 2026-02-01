// API Endpoint: Resume Workflow Execution
// POST /api/workflows/[id]/resume

import { NextRequest, NextResponse } from 'next/server';
import { workflowService } from '@/lib/services';
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
    const { notes } = body;

    try {
      const updatedWorkflow = await workflowService.resumeWorkflow(
        workflowId,
        user.id,
        notes
      );

      return NextResponse.json({
        data: updatedWorkflow,
        success: true,
        message: 'Workflow resumed successfully'
      });

    } catch (error) {
      console.error('Error resuming workflow:', error);
      const message = error instanceof Error ? error.message : 'Failed to resume workflow';
      
      if (message.includes('not found') || message.includes('Not found')) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
      }
      
      if (message.includes('Cannot resume')) {
        return NextResponse.json({ error: message }, { status: 400 });
      }
      
      return NextResponse.json({ error: message }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in resume workflow API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
