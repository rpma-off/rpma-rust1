import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { Database } from '@/types/database.types';

type _Task = Database['public']['Tables']['tasks']['Row'];




// DELETE /api/admin/tasks/[taskId] - Delete a specific task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{taskId: string}> }
): Promise<NextResponse> {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'supervisor', 'technician'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Action non autorisée - Rôle insuffisant' },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const { taskId } = await params;
    
    if (!taskId) {
      return NextResponse.json(
        { error: 'ID de la tâche manquant' },
        { status: 400 }
      );
    }

    console.log('Attempting to delete task with ID:', taskId);
    
    try {
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('id, status, created_at, checklist_id')
        .eq('id', taskId)
        .single();

      if (taskError || !task) {
        console.error('Task not found or error fetching task:', taskError);
        return NextResponse.json(
          { error: 'Tâche non trouvée' },
          { status: 404 }
        );
      }


      
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (deleteError) {
        console.error('Error deleting task:', deleteError);
        throw deleteError;
      }
      
      console.log('Task and related records deleted successfully');

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error in DELETE /api/admin/tasks/[taskId]:', error);
      return NextResponse.json(
        { 
          error: 'Erreur lors de la suppression de la tâche',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in DELETE /api/admin/tasks/[taskId]:', error);
    return NextResponse.json(
      { 
        error: 'Erreur inattendue',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/admin/tasks/[taskId] - Get a specific task with all details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{taskId: string}> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'supervisor', 'technician'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Action non autorisée' },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const { taskId } = await params;
    
    if (!taskId) {
      return NextResponse.json(
        { error: 'ID de la tâche manquant' },
        { status: 400 }
      );
    }

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: 'Tâche non trouvée' },
        { status: 404 }
      );
    }

    const { data: photos } = await supabase
      .from('task_photos')
      .select('*')
      .eq('task_id', taskId);

    return NextResponse.json({
      ...task,
      photos: photos || [],
    });
  } catch (error) {
    console.error('Error in GET /api/admin/tasks/[taskId]:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
