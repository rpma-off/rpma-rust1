import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { Database } from '@/types/database.types';

type Task = Database['public']['Tables']['tasks']['Row'];


export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{id: string}> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { id: taskId } = await params;
    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

// Get the technician's ID from their user ID
    const { data: technician, error: techError } = await supabase
      .from('technicians')
      .select('id')
      .eq('user_id', user.id)
      .single() as { data: { id: string } | null; error: unknown | null };

    if (techError || !technician) {
      return NextResponse.json(
        { error: 'Technician not found' },
        { status: 403 }
      );
    }

    // Get the task with current status
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single() as { data: Task | null; error: unknown | null };

    if (taskError || !task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Update the task with technician assignment and status
    const now = new Date().toISOString();
    const updateData = {
      technician_id: technician.id,
      status: 'in_progress',
      start_time: now,
      updated_at: now
    };

    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select(`
        *,
        technicians:technician_id (id, name, email)
      `)
      .single();

    if (updateError) {
      console.error('Error updating task:', updateError);
      return NextResponse.json(
        { error: 'Failed to start intervention' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error in start-intervention:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
