import { NextResponse } from 'next/server';
import { Database } from '@/types/database.types';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type TaskExecutionUpdate = Database['public']['Tables']['interventions']['Update'];
type TaskExecutionInsert = Database['public']['Tables']['interventions']['Insert'];
type TaskExecution = Database['public']['Tables']['interventions']['Row'];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('task_id');
    
    if (!taskId) {
      return NextResponse.json(
        { error: 'task_id is required' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
     // Get workflow execution for the task
     const { data: workflow, error } = await supabase
       .from('task_step_progress')
       .select(`
         id,
         task_id,
         step_id,
         status,
         created_at
       `)
       .eq('task_id', taskId)
       .single() as { data: unknown | null; error: unknown | null };
    
    if (error) {
      if ((error as { code?: string })?.code === 'PGRST116') {
        // No workflow found for this task
        return NextResponse.json({
          data: null,
          message: 'No workflow found for this task'
        });
      }
      
      console.error('Database query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch workflow' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      data: workflow
    });
    
  } catch (error) {
    console.error('Unexpected error in GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { task_id, template_id } = body;
    
    if (!task_id || !template_id) {
      return NextResponse.json(
        { error: 'task_id and template_id are required' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();

    // Fetch task to get vehicle_plate
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('vehicle_plate')
      .eq('task_number', task_id)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Create workflow execution
    const insertData: TaskExecutionInsert = {
      task_number: task_id,
      status: 'pending',
      vehicle_plate: (task as { vehicle_plate?: string }).vehicle_plate || '',
      created_at: Date.now()
    };

    const { data: newWorkflow, error } = await supabase
      .from('task_executions')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create workflow' },
        { status: 500 }
      );
    }

    const workflow = newWorkflow as TaskExecution;
    return NextResponse.json({
      id: workflow.id,
      taskId: workflow.task_number,
      templateId: workflow.current_step, // Using current_step as template_id
      status: workflow.status,
      createdAt: workflow.created_at
    }, { status: 201 });
    
  } catch (error) {
    console.error('Unexpected error in POST route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { workflow_id, status, current_step_id: _current_step_id } = body;
    
    if (!workflow_id) {
      return NextResponse.json(
        { error: 'workflow_id is required' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
    const updateData: TaskExecutionUpdate = {};

    if (status) updateData.status = status;
    // Note: current_step_id and completed_at fields don't exist in task_step_progress table

    // Update workflow execution
    const { data: updatedWorkflow, error } = await supabase
      .from('task_executions')
      .update(updateData)
      .eq('id', workflow_id)
      .select('*')
      .single();
    
    if (error) {
      console.error('Database update error:', error);
      return NextResponse.json(
        { error: 'Failed to update workflow' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'Workflow updated successfully',
      data: updatedWorkflow
    });
    
  } catch (error) {
    console.error('Unexpected error in PUT route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
   }
}
