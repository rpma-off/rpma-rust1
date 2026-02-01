import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth } from '@/lib/api-auth';
import { validateCSRFRequest } from '@/lib/auth/csrf';
import { Database } from '@/types/database.types';

type Task = Database['public']['Tables']['tasks']['Row'];


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{id: string}> }
) {
  try {
    // Validate CSRF token first
    const isValidCSRF = await validateCSRFRequest(request);
    if (!isValidCSRF) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

     // Validate authentication and authorization
     const authResult = await validateApiAuth(request, {
       requireAuth: true,
       allowedRoles: ['admin', 'manager'],
       allowedMethods: ['POST'],
       sanitizeInput: true
     });

    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: authResult.statusCode || 401 }
      );
    }

    const supabase = await createClient();

    // Use sanitized body from auth validation (body was already read there)
    const body = authResult.sanitizedBody as Record<string, unknown>;

    if (!body) {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      );
    }

    const { technicianId } = body as { technicianId?: string };

    if (!technicianId) {
      return NextResponse.json({ error: 'technicianId is required' }, { status: 400 });
    }

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
      .eq('user_id', technicianId)
      .single() as { data: { id: string } | null; error: unknown | null };

    if (techError || !technician) {
      console.error('Technician lookup error:', techError);
      return NextResponse.json(
        { error: 'Technician not found' },
        { status: 403 }
      );
    }

    // Check if the task exists and get current state
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('is_available, technician_id, status')
      .eq('id', taskId)
      .single() as { data: Task | null; error: unknown | null };

    if (taskError || !task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Allow reassignment if task is not completed or cancelled
    if (task.status === 'completed' || task.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot assign completed or cancelled task' },
        { status: 409 }
      );
    }

    // Check if trying to assign to the same technician
    if (task.technician_id === technician.id) {
      return NextResponse.json(
        { error: 'Task is already assigned to this technician' },
        { status: 409 }
      );
    }

    // Assign the task to the technician
    const now = new Date().toISOString();
    const isReassignment = task.technician_id !== null;

  const updateData = {
      technician_id: technician.id,
      assigned_at: now,
      status: isReassignment ? task.status || 'pending' : 'assigned', // Keep current status if reassigning
      updated_at: now
    };

    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error assigning task:', error);
    return NextResponse.json(
      { error: 'Failed to assign task' },
      { status: 500 }
    );
  }
}
