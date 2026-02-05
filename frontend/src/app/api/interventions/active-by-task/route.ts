 import { NextRequest, NextResponse } from 'next/server';
  import { z } from 'zod';
  import { ipcClient } from '@/lib/ipc';
  import { validateApiAuth } from '@/lib/api-auth';
  import type { Intervention } from '@/lib/backend';

 export const dynamic = 'force-dynamic';

 const QueryParamsSchema = z.object({
   taskId: z.string().uuid(), // Validate taskId as a UUID
 });

 export async function GET(request: NextRequest) {
   try {
     // Validate authentication
     const authResult = await validateApiAuth(request);
     if (!authResult.isValid) {
       return NextResponse.json(
         { error: 'Unauthorized' },
         { status: 401 }
       );
     }

    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams.entries());

    const validationResult = QueryParamsSchema.safeParse(rawParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters', 
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const { taskId } = validationResult.data;

    // Get session token from Authorization header
    const authHeader = request.headers.get('authorization') || '';
    const sessionToken = authHeader.replace('Bearer ', '');

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Session token required' },
        { status: 401 }
      );
    }

    // First get the full task details to ensure we have the correct UUID
    const taskResult = await ipcClient.tasks.get(taskId, sessionToken);
    if (!taskResult) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Use the task's UUID for intervention lookup
    const result = await ipcClient.interventions.getActiveByTask(taskResult.id, sessionToken) as { type: string; intervention?: Intervention | null };

    // The response should be { type: 'ActiveRetrieved', intervention: ... }
    if (result.type === 'ActiveRetrieved') {
      if (result.intervention) {
        return NextResponse.json(
          {
            success: true,
            data: result.intervention,
          },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          { message: 'No active intervention found for this task' },
          { status: 200 }
        );
      }
    }

    return NextResponse.json(
      { message: 'No active intervention found for this task' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error in active-by-task endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
