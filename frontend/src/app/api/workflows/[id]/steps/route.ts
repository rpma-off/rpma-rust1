import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/api-auth';

// GET /api/workflows/[id]/steps
// Returns step progress rows for a workflow execution (task_execution_id)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{id: string}> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { id: executionId } = await params;
    if (!executionId) {
      return NextResponse.json({ error: 'Workflow execution id is required' }, { status: 400 });
    }

    // Directly query Supabase for workflow steps to avoid circular dependency
    const { data: steps, error } = await supabase
      .from('task_step_progress')
      .select(`
        *,
        sop_template_step:sop_template_steps(
          *,
          sop_template_checklist_items(*)
        )
      `)
      .eq('task_execution_id', executionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Database query error fetching workflow steps:', error);
      return NextResponse.json(
        { error: 'Failed to fetch workflow steps' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: steps,
      message: `Retrieved ${(steps as unknown[]).length} workflow steps`
    });

  } catch (err) {
    console.error('Error in GET /api/workflows/[id]/steps:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
