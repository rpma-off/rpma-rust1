 import { createClient } from '@/lib/supabase/server';
 import { NextRequest, NextResponse } from 'next/server';
 import { validateApiAuth } from '@/lib/api-auth';

 export const dynamic = 'force-dynamic';

 // Enhanced Types for API Response

// Type for raw RPC result
interface RawTaskStats {
  total?: number;
  completed?: number;
  inProgress?: number;
  pending?: number;
  averageCompletionTime?: number;
  byTechnician?: Array<{
    technician: string;
    completed: number;
    inProgress: number;
    pending: number;
    total: number;
  }>;
  byDate?: Array<{
    date: string;
    count: number;
    completed: number;
    inProgress: number;
    pending: number;
  }>;
  byPPFZone?: Array<{
    zone: string;
    count: number;
    completed: number;
    inProgress: number;
    pending: number;
  }>;
  byVehicleModel?: Array<{
    model: string;
    count: number;
    completed: number;
    inProgress: number;
    pending: number;
  }>;
}

interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  averageCompletionTime: number;
  byTechnician: Array<{
    technician: string;
    completed: number;
    inProgress: number;
    pending: number;
    total: number;
    efficiency: number;
  }>;
  byDate: Array<{
    date: string;
    count: number;
    completed: number;
    inProgress: number;
    pending: number;
  }>;
  byPPFZone: Array<{
    zone: string;
    count: number;
    completed: number;
    inProgress: number;
    pending: number;
  }>;
  byVehicleModel: Array<{
    model: string;
    count: number;
    completed: number;
    inProgress: number;
    pending: number;
  }>;
}

// Main API handler
export async function GET(request: NextRequest) {
  try {
    // Validate authentication and authorization
    const authResult = await validateApiAuth(request);

    if (!authResult.isValid || !authResult.user?.role || !['admin', 'supervisor', 'technician'].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: authResult.statusCode || 401 }
      );
    }

    const supabase = await createClient();
    const hasAdminAccess = ['admin', 'supervisor', 'technician'].includes(authResult.user.role);

    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: 'Forbidden - Admin or Manager access required' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const searchParams = new URLSearchParams(url.search);
    const startDateStr = searchParams.get('start');
    const endDateStr = searchParams.get('end');

    const fromDate = startDateStr ? new Date(startDateStr) : new Date();
    fromDate.setHours(0, 0, 0, 0);
    if (isNaN(fromDate.getTime())) {
      return NextResponse.json({ error: 'Invalid start date format' }, { status: 400 });
    }
    
    const toDate = endDateStr ? new Date(endDateStr) : new Date();
    toDate.setHours(23, 59, 59, 999);
    if (isNaN(toDate.getTime())) {
      return NextResponse.json({ error: 'Invalid end date format' }, { status: 400 });
    }
    
     // Call the Supabase RPC function to get aggregated statistics
     const { data, error } = await supabase.rpc('get_workflow_metrics') as { data: RawTaskStats | null; error: unknown | null };

    if (error) {
      console.error('Error fetching statistics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch statistics: ' + (error && typeof error === 'object' && 'message' in error ? error.message : 'Unknown error') },
        { status: 500 }
      );
    }

    // If no data, return an empty response
    if (!data) {
      const emptyResponse: TaskStats = {
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        averageCompletionTime: 0,
        byTechnician: [],
        byDate: [],
        byPPFZone: [],
        byVehicleModel: [],
      };
      return NextResponse.json(emptyResponse);
    }

    // Prepare the final response, ensuring all fields are correctly typed
    const statsData = data as RawTaskStats | null;
    const response: TaskStats = {
      total: statsData?.total || 0,
      completed: statsData?.completed || 0,
      inProgress: statsData?.inProgress || 0,
      pending: statsData?.pending || 0,
      averageCompletionTime: parseFloat((statsData?.averageCompletionTime || 0).toFixed(2)),
      byTechnician: (statsData?.byTechnician || []).map((tech) => ({
        ...tech,
        efficiency: tech.total > 0 ? (tech.completed / tech.total) * 100 : 0,
      })),
      byDate: statsData?.byDate || [],
      byPPFZone: statsData?.byPPFZone || [],
      byVehicleModel: statsData?.byVehicleModel || [],
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error in statistics API:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const status = error instanceof Error && (error.message.includes('token') || error.message.includes('Unauthorized'))
      ? 401
      : error instanceof Error && error.message.includes('Forbidden')
      ? 403
      : 500;

    return NextResponse.json({ error: errorMessage }, { status });
  }
}
