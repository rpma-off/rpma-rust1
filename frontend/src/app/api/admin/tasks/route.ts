 import { NextResponse } from 'next/server';
 import { createClient } from '@/lib/supabase/server';
 import { Database } from '@/types/database.types';

 export const dynamic = 'force-dynamic';

type Task = Database['public']['Tables']['tasks']['Row'];
type _Technician = Database['public']['Tables']['technicians']['Row'];
type TaskPhoto = Database['public']['Tables']['task_photos']['Row'];


// GET /api/admin/tasks - Get all tasks with details
export async function GET(request: Request) {
  const supabaseClient = await createClient();

  try {
    // Get the authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token d\'authentification manquant' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    // Verify the token
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json(
        { error: 'Session expirée ou invalide' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data, error: userError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userData = data as { role: string } | null;

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Action non autorisée' },
        { status: 403 }
      );
    }

     // Fetch tasks with related data
     const { data: tasks, error: tasksError } = await supabaseClient
       .from('tasks')
       .select(`
         *,
         technicians (
           id,
           name
         )
       `)
       .order('created_at', { ascending: false }) as { data: Task[] | null; error: unknown | null };

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des tâches' },
        { status: 500 }
      );
    }

    // Try to fetch photos for each task, but handle case when the table doesn't exist
    try {
      const tasksWithPhotos = await Promise.all(
        (tasks || []).map(async (task: Task) => {
          try {
            // First check if the task_photos table exists
            const { data: photos, error: photosError } = await supabaseClient
              .from('task_photos')
              .select('*')
              .eq('task_id', task.id);

            if (photosError && 'code' in photosError && (photosError as { code: string }).code === '42P01') { // Table doesn't exist
              console.warn('task_photos table does not exist, returning empty photo arrays');
              return {
                ...task,
                photos_before: [],
                photos_after: []
              };
            } else if (photosError) {
              console.error('Error fetching photos for task:', photosError);
              // Continue with empty photos if there's an error
              return {
                ...task,
                photos_before: [],
                photos_after: []
              };
            }

            return {
              ...task,
              photos_before: (photos as TaskPhoto[])?.filter((p: TaskPhoto) => p.photo_type === 'before') || [],
              photos_after: (photos as TaskPhoto[])?.filter((p: TaskPhoto) => p.photo_type === 'after') || []
            };
          } catch (error) {
            console.error(`Error processing photos for task ${task.id}:`, error);
            return {
              ...task,
              photos_before: [],
              photos_after: []
            };
          }
        })
      );

      return NextResponse.json(tasksWithPhotos);
    } catch (error) {
      console.error('Error in photo processing:', error);
      // If there's any error with photos, still return tasks but with empty photo arrays
      const tasksWithoutPhotos = (tasks || []).map((task: Task) => ({
        ...task,
        photos_before: [],
        photos_after: []
      }));
      return NextResponse.json(tasksWithoutPhotos);
    }
  } catch (error) {
    console.error('Error in GET /api/admin/tasks:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// POST /api/admin/tasks/bulk - Bulk actions on tasks
export async function POST(request: Request) {
  const supabaseClient = await createClient();
  let result = { success: false, count: 0 };

  try {
    // Get the authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token d\'authentification manquant' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    // Verify the token
    const { data: { user }, error: userAuthError } = await supabaseClient.auth.getUser(token);

    if (userAuthError || !user) {
      return NextResponse.json(
        { error: 'Session expirée ou invalide' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data, error: userError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userData = data as { role: string } | null;

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Action non autorisée' },
        { status: 403 }
      );
    }

    const { taskIds, action }: { taskIds: string[]; action: 'delete' | 'archive' | 'restore' } = await request.json();

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: 'Aucune tâche sélectionnée' },
        { status: 400 }
      );
    }

    if (!['delete', 'archive', 'restore'].includes(action)) {
      return NextResponse.json(
        { error: 'Action non valide' },
        { status: 400 }
      );
    }

    // Perform the bulk action
    if (action === 'delete') {
      // Delete tasks and related data
      const { error: deleteError } = await supabaseClient
        .from('tasks')
        .delete()
        .in('id', taskIds);
        
      if (deleteError) {
        console.error('Error deleting tasks:', deleteError);
        throw deleteError;
      }
      
      result = { success: true, count: taskIds.length };
    } else {
      // Update task status
      const updateData = {
        status: action === 'archive' ? 'archived' : 'pending',
        updated_at: new Date().toISOString()
      };
      const { error: updateError } = await supabaseClient
        .from('tasks')
        .update(updateData)
        .in('id', taskIds);
        
      if (updateError) {
        console.error('Error updating tasks:', updateError);
        throw updateError;
      }
      
      result = { success: true, count: taskIds.length };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in bulk action:', error);
    return NextResponse.json(
      { error: 'Erreur lors du traitement de la requête' },
      { status: 500 }
    );
  }
}
