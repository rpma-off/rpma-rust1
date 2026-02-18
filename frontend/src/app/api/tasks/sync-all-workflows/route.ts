import { NextRequest, NextResponse } from 'next/server';
import { withMethod } from '@/lib/api-route-wrapper';
import { handleApiError } from '@/lib/api-error';
import { createClient } from '@/lib/supabase/server';
import { taskWorkflowSyncService } from '@/domains/workflow/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { Database } from '@/types/database.types';

type _User = Database['public']['Tables']['users']['Row'];


/**
 * POST /api/tasks/sync-all-workflows
 * Sync all tasks with their workflows
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handlePost(request: NextRequest, context?: unknown) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    // Check if user has admin permissions
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile as { role: string }).role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Perform bulk sync
    const results = await taskWorkflowSyncService.syncAllTasksWithWorkflows();

    const syncedCount = results.filter(r => r.isSynced).length;
    const errorCount = results.length - syncedCount;

    return NextResponse.json({
      success: true,
      syncedCount,
      errorCount,
      results,
      message: `Synchronized ${syncedCount} tasks with workflows`
    });

  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withMethod(['POST'])(handlePost);

