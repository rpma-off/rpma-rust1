 import { createClient } from '@supabase/supabase-js';
 import { NextResponse } from 'next/server';

 export const dynamic = 'force-dynamic';

 // Initialize Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
  console.log('Bulk action endpoint called');
  
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Non autorisé - Token manquant' },
        { status: 401 }
      );
    }
    
    // Parse the request body
    const { taskIds, action } = await request.json();
    
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: 'ID de tâches manquants ou invalides' },
        { status: 400 }
      );
    }
    
    if (!['delete', 'invalidate'].includes(action)) {
      return NextResponse.json(
        { error: 'Action non valide. Utilisez "delete" ou "invalidate"' },
        { status: 400 }
      );
    }

    // Process the bulk action
    if (action === 'delete') {
      console.log(`Deleting ${taskIds.length} tasks`);
      
      // Process in chunks to avoid hitting limits
      const chunkSize = 10;
      const chunks: string[][] = [];
      for (let i = 0; i < taskIds.length; i += chunkSize) {
        chunks.push(taskIds.slice(i, i + chunkSize));
      }
      
      // Process each chunk
      for (let index = 0; index < chunks.length; index++) {
        const chunk = chunks[index];
        console.log(`Processing chunk ${index + 1}/${chunks.length}`);
        
        try {
          // Delete related photos
          const { error: photoError } = await supabase
            .from('photos')
            .delete()
            .in('task_id', chunk);
            
          if (photoError) {
            console.error('Error deleting photos:', photoError);
            throw new Error(`Failed to delete photos: ${photoError.message}`);
          }
          
          // Delete related checklist items
          const { error: checklistError } = await supabase
            .from('task_checklist_items')
            .delete()
            .in('task_id', chunk);
            
          if (checklistError) {
            console.error('Error deleting checklist items:', checklistError);
            throw new Error(`Failed to delete checklist items: ${checklistError.message}`);
          }
          
          // Delete the tasks
          const { error: taskError } = await supabase
            .from('tasks')
            .delete()
            .in('id', chunk);
            
          if (taskError) {
            console.error('Error deleting tasks:', taskError);
            throw new Error(`Failed to delete tasks: ${taskError.message}`);
          }
          
          console.log(`Successfully processed chunk ${index + 1}/${chunks.length}`);
          
        } catch (error) {
          console.error(`Error in chunk ${index + 1}:`, error);
          throw error; // Re-throw to be caught by the outer try-catch
        }
      }
      
      return NextResponse.json(
        { message: `${taskIds.length} tâches supprimées avec succès` },
        { status: 200 }
      );
      
    } else if (action === 'invalidate') {
      console.log(`Invalidating ${taskIds.length} tasks`);

      // Process in chunks
      const chunkSize = 10;
      for (let i = 0; i < taskIds.length; i += chunkSize) {
        const chunk = taskIds.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('tasks')
          .update({ is_valid: false })
          .in('id', chunk);

        if (error) throw error;
      }

      return NextResponse.json(
        { message: `${taskIds.length} tâches marquées comme invalides` },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: 'Action non supportée' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in bulk action:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : undefined;
    
    console.error('Full error details:', { errorMessage, errorDetails });
    
    return NextResponse.json(
      { 
        error: 'Une erreur est survenue lors du traitement de la demande',
        message: errorMessage,
        details: errorDetails
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
