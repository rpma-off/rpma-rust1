import { NextRequest, NextResponse } from 'next/server';
import { withMethod } from '@/lib/api-route-wrapper';
import { handleApiError } from '@/lib/api-error';
import { taskWorkflowSyncService } from '@/domains/workflow/server';
import { getAuthenticatedUser } from '@/lib/api-auth';

/**
 * POST /api/tasks/[id]/sync-workflow
 * Sync task status with workflow execution status
 */
async function handlePost(
  request: NextRequest,
  context?: unknown
) {
  try {
    const params = await (context as { params: Promise<{ id: string }> }).params;
    const { id } = params;
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const taskId = id;
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Sync task with workflow
    const result = await taskWorkflowSyncService.syncTaskWithWorkflow(taskId);

    return NextResponse.json({
      success: true,
      task: result.task,
      intervention: result.intervention,
      workflowProgress: result.workflowProgress,
      isSynced: result.isSynced,
      lastSyncTime: result.lastSyncTime,
      message: 'Task synchronized with workflow successfully'
    });

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/tasks/[id]/sync-workflow
 * Get task with workflow progress information
 */
async function handleGet(
  request: NextRequest,
  context?: unknown
) {
  try {
    const params = await (context as { params: Promise<{ id: string }> }).params;
    const { id } = params;
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const taskId = id;
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Get task with workflow progress
    const result = await taskWorkflowSyncService.getTaskWithWorkflowProgress(taskId);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withMethod(['POST'])(handlePost);
export const GET = withMethod(['GET'])(handleGet);

