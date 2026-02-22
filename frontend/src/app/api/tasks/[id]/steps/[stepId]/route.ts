import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { taskService } from '@/domains/tasks/server';

async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string  }> }
) {
  try {
    const { id: taskId, stepId  } = await params;
    const body = await request.json();
    const { step_data, updated_at } = body;

    // Create Supabase client
    const supabase = await getSupabaseClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate step data
    if (!step_data || typeof step_data !== 'object') {
      return NextResponse.json(
        { error: 'Invalid step data' },
        { status: 400 }
      );
    }

    // Use TaskService to update step data with centralized validation and audit
    try {
      const result = await taskService.updateTaskStepData(
        taskId,
        stepId,
        step_data,
        user.id,
        updated_at
      );

      if (!result.success || !result.data) {
        return NextResponse.json(
          { error: result.error || 'Failed to save step data' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        saved_at: new Date().toISOString(),
        message: 'Step data saved successfully'
      });

    } catch (error) {
      console.error('Error saving step data:', error);
      const message = error instanceof Error ? error.message : 'Failed to save step data';
      
      if (message.includes('not found') || message.includes('Not found')) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      
      if (message.includes('permission') || message.includes('access')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
      
      return NextResponse.json({ error: message }, { status: 500 });
    }

  } catch (error) {
    console.error('Step save API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string  }> }
) {
  try {
    const { id: taskId, stepId  } = await params;

    // Create Supabase client
    const supabase = await getSupabaseClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use TaskService to get step data with centralized access control
    try {
      const result = await taskService.getTaskStepData(taskId, stepId, user.id);

      if (!result.success || !result.data) {
        return NextResponse.json(
          { error: result.error || 'Failed to retrieve step data' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        step_id: stepId,
        data: result.data.stepData,
        last_updated: result.data.lastUpdated,
        task_status: result.data.taskStatus,
        message: 'Step data retrieved successfully'
      });

    } catch (error) {
      console.error('Error retrieving step data:', error);
      const message = error instanceof Error ? error.message : 'Failed to retrieve step data';
      
      if (message.includes('not found') || message.includes('Not found')) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      
      if (message.includes('permission') || message.includes('access')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
      
      if (message.includes('Invalid step')) {
        return NextResponse.json({ error: 'Invalid step ID' }, { status: 400 });
      }
      
      return NextResponse.json({ error: message }, { status: 500 });
    }

  } catch (error) {
    console.error('Step get API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
