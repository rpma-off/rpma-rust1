import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database.types';

type TaskPhoto = Database['public']['Tables']['task_photos']['Row'];

// DELETE /api/admin/tasks/[taskId]/photos/[photoId] - Delete a specific photo
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ taskId: string; photoId: string  }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!['admin', 'supervisor'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const paramsResolved = await params;

    // First, get the photo to delete it from storage
    const { data: photo, error: photoError } = await supabase
      .from('task_photos')
      .select('*')
      .eq('id', paramsResolved.photoId)
      .eq('task_id', paramsResolved.taskId)
      .single();

    if (photoError || !photo) {
      console.error('Error finding photo:', photoError);
      return NextResponse.json(
        { error: 'Photo non trouvée' },
        { status: 404 }
      );
    }

    // Delete the photo from storage if it has a url
    if (photo && (photo as TaskPhoto).url) {
      const photoUrl = (photo as TaskPhoto).url;
      if (photoUrl) {
        // Extract the file path from the URL for storage deletion
        const urlParts = photoUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const { error: storageError } = await supabase.storage
          .from('photos')
          .remove([fileName]);

        if (storageError) {
          console.error('Error deleting photo from storage:', storageError);
          // Continue even if storage deletion fails, as we still want to remove the DB record
        }
      }
    }

    // Delete the photo record from the database
    const { error: deleteError } = await supabase
      .from('task_photos')
      .delete()
      .eq('id', paramsResolved.photoId)
      .eq('task_id', paramsResolved.taskId);

    if (deleteError) {
      console.error('Error deleting photo from database:', deleteError);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression de la photo' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/tasks/[taskId]/photos/[photoId]:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
