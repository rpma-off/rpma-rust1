import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Create Supabase client directly
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Missing environment variables' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get user metrics
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, created_at, last_sign_in_at');

    if (usersError) {
      console.error('Error fetching users:', usersError);
    }

    // Get task metrics
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, status, created_at');

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
    }

    // Get quality metrics
    const { data: qualityReviews, error: qualityError } = await supabase
      .from('quality_reviews')
      .select('id, status, quality_score');

    if (qualityError) {
      console.error('Error fetching quality reviews:', qualityError);
    }

    // Calculate user metrics
    const totalUsers = users?.length || 0;
    const activeUsers = users?.filter(u => {
      if (!u.last_sign_in_at) return false;
      const lastSignIn = new Date(u.last_sign_in_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return lastSignIn > weekAgo;
    }).length || 0;
    
    const newUsers = users?.filter(u => {
      const createdAt = new Date(u.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return createdAt > weekAgo;
    }).length || 0;

    // Calculate task metrics
    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
    const inProgressTasks = tasks?.filter(t => t.status === 'in_progress').length || 0;
    const pendingTasks = tasks?.filter(t => t.status === 'pending').length || 0;

    // Calculate quality metrics
    const approvedReviews = qualityReviews?.filter(r => r.status === 'approved').length || 0;
    const rejectedReviews = qualityReviews?.filter(r => r.status === 'rejected').length || 0;
    const pendingReviews = qualityReviews?.filter(r => r.status === 'pending').length || 0;
    
    const avgQualityScore = qualityReviews && qualityReviews.length > 0
      ? qualityReviews.reduce((sum, r) => sum + (r.quality_score || 0), 0) / qualityReviews.length
      : 8.5; // Default score

    // Mock system metrics (in a real implementation, these would come from system monitoring)
    const systemUptime = 30 * 24 * 3600; // 30 days in seconds
    const systemPerformance = 75; // CPU usage percentage
    const systemStorage = 2.5 * 1024 * 1024 * 1024; // 2.5GB in bytes
    const systemErrors = 3; // Number of errors in the last 24 hours

    const metrics = {
      users: {
        total: totalUsers,
        active: activeUsers,
        new: newUsers
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        pending: pendingTasks
      },
      system: {
        uptime: systemUptime,
        performance: systemPerformance,
        storage: systemStorage,
        errors: systemErrors
      },
      quality: {
        avgScore: avgQualityScore,
        approved: approvedReviews,
        rejected: rejectedReviews,
        pending: pendingReviews
      }
    };

    return NextResponse.json(metrics);

  } catch (error) {
    console.error('Error in GET /api/admin/metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
