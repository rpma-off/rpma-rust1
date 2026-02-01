 import { NextResponse } from 'next/server';
 import { taskPhotoService, TaskPhotoQueryParams } from '@/lib/services';
 import { getErrorMessage } from '@/types/api';

export const dynamic = 'force-dynamic';


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const typeParam = searchParams.get('type');
    const params: TaskPhotoQueryParams = {
      task_id: searchParams.get('task_id') || undefined,
      type: (typeParam === 'before' || typeParam === 'after' || typeParam === 'during') ? typeParam : undefined,
      step_id: searchParams.get('step_id') || undefined,
      uploaded_after: searchParams.get('uploaded_after') || undefined,
      uploaded_before: searchParams.get('uploaded_before') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '50'),
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    };
    
     // Use centralized service
     const result = await taskPhotoService.getPhotos(params);

     if (result.error) {
       return NextResponse.json(
         { error: getErrorMessage(result.error || 'Failed to fetch photos') },
         { status: 400 }
       );
     }

     return NextResponse.json(result.data);
    
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
    // Parse request body
    const body = await request.json();
    
     // Use centralized service
     const result = await taskPhotoService.createTaskPhoto(body);

     if (result.error) {
       return NextResponse.json(
         { error: getErrorMessage(result.error || 'Failed to create photo') },
         { status: 400 }
       );
     }

     return NextResponse.json(result.data, { status: 201 });
    
  } catch (error) {
    console.error('Unexpected error in POST route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
