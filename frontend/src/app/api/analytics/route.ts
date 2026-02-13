import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface SupabaseExecution {
  id: string;
  started_at: string | null;
  completed_at: string | null;
  status: string;
  template_id: string;
  tasks: Array<{
    id: string;
    technician_id: string;
    technicians: Array<{
      id: string;
      name: string;
    }>;
  }>;
  sop_templates: Array<{
    id: string;
    name: string;
  }> | null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    
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
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    switch (range) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get overview metrics
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, status, created_at, updated_at, technician_id, template_id')
      .gte('created_at', startDate.toISOString());

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    // Get users count
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id');

    if (usersError) {
      console.error('Error fetching users:', usersError);
    }

    // Get workflow executions for completion time analysis
    const { data: executions, error: executionsError } = await supabase
      .from('task_executions')
      .select(`
        id,
        started_at,
        completed_at,
        status,
        template_id,
        tasks!inner(
          id,
          technician_id,
          technicians!inner(
            id,
            name
          )
        ),
        sop_templates!inner(
          id,
          name
        )
      `)
      .gte('created_at', startDate.toISOString());

    if (executionsError) {
      console.error('Error fetching executions:', executionsError);
    }

    // Calculate overview metrics
    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
    const activeTasks = tasks?.filter(t => t.status === 'in_progress').length || 0;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate average completion time
    const completedExecutions = executions?.filter(e => 
      e.status === 'completed' && e.started_at && e.completed_at
    ) || [];
    
    const avgCompletionTime = completedExecutions.length > 0 
      ? completedExecutions.reduce((acc, exec) => {
          const start = new Date(exec.started_at);
          const end = new Date(exec.completed_at);
          return acc + (end.getTime() - start.getTime()) / (1000 * 60); // minutes
        }, 0) / completedExecutions.length
      : 0;

    // Calculate quality score (simplified - based on completion rate and rework)
    const qualityScore = Math.min(10, (completionRate / 10) + 5);

    // Generate daily trends
    const dailyTrends: Array<{
      date: string;
      tasks: number;
      completed: number;
      avgTime: number;
    }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayTasks = tasks?.filter(t => 
        t.created_at.startsWith(dateStr)
      ) || [];
      
      const dayCompleted = dayTasks.filter(t => t.status === 'completed').length;
      const dayAvgTime = dayCompleted > 0 ? avgCompletionTime : 0;
      
      dailyTrends.push({
        date: date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
        tasks: dayTasks.length,
        completed: dayCompleted,
        avgTime: dayAvgTime
      });
    }

    // Generate weekly trends
    const weeklyTrends: Array<{
      week: string;
      tasks: number;
      completed: number;
      avgTime: number;
    }> = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weekTasks = tasks?.filter(t => {
        const taskDate = new Date(t.created_at);
        return taskDate >= weekStart && taskDate <= weekEnd;
      }) || [];
      
      const weekCompleted = weekTasks.filter(t => t.status === 'completed').length;
      const weekAvgTime = weekCompleted > 0 ? avgCompletionTime : 0;
      
      weeklyTrends.push({
        week: `Semaine ${4 - i}`,
        tasks: weekTasks.length,
        completed: weekCompleted,
        avgTime: weekAvgTime
      });
    }

    // Generate monthly trends
    const monthlyTrends: Array<{
      month: string;
      tasks: number;
      completed: number;
      avgTime: number;
    }> = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      
      const monthTasks = tasks?.filter(t => {
        const taskDate = new Date(t.created_at);
        return taskDate.getMonth() === month.getMonth() && 
               taskDate.getFullYear() === month.getFullYear();
      }) || [];
      
      const monthCompleted = monthTasks.filter(t => t.status === 'completed').length;
      const monthAvgTime = monthCompleted > 0 ? avgCompletionTime : 0;
      
      monthlyTrends.push({
        month: month.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        tasks: monthTasks.length,
        completed: monthCompleted,
        avgTime: monthAvgTime
      });
    }

    // Calculate technician performance
    const technicianStats = new Map<string, {
      id: string;
      name: string;
      tasksCompleted: number;
      totalTime: number;
      qualityScore: number;
    }>();

    // Cast executions to the expected type from Supabase
    const executionsData = executions as SupabaseExecution[] || [];
    executionsData.forEach((exec: SupabaseExecution) => {
      // Handle nested structure from Supabase query
      const taskData = Array.isArray(exec.tasks) ? exec.tasks[0] : exec.tasks;
      const technicianData = taskData?.technicians ?
        (Array.isArray(taskData.technicians) ? taskData.technicians[0] : taskData.technicians) : null;

      const techId = taskData?.technician_id;
      const techName = technicianData?.name;
      
      if (techId && techName) {
        if (!technicianStats.has(techId)) {
          technicianStats.set(techId, {
            id: techId,
            name: techName,
            tasksCompleted: 0,
            totalTime: 0,
            qualityScore: 0
          });
        }
        
        const stats = technicianStats.get(techId)!;
        if (exec.status === 'completed') {
          stats.tasksCompleted++;
          if (exec.started_at && exec.completed_at) {
            const duration = (new Date(exec.completed_at).getTime() - new Date(exec.started_at).getTime()) / (1000 * 60);
            stats.totalTime += duration;
          }
        }
      }
    });

    const technicianPerformance = Array.from(technicianStats.values()).map(tech => ({
      ...tech,
      avgTime: tech.tasksCompleted > 0 ? tech.totalTime / tech.tasksCompleted : 0,
      qualityScore: Math.min(10, (tech.tasksCompleted / 10) + 5),
      efficiency: Math.min(100, (tech.tasksCompleted / 5) * 100)
    }));

    // Calculate template performance
    const templateStats = new Map<string, {
      id: string;
      name: string;
      usageCount: number;
      totalTime: number;
      successCount: number;
    }>();

    executionsData.forEach((exec: SupabaseExecution) => {
      const templateData = Array.isArray(exec.sop_templates) ? exec.sop_templates[0] : exec.sop_templates;
      const templateId = exec.template_id;
      const templateName = templateData?.name;
      
      if (templateId && templateName) {
        if (!templateStats.has(templateId)) {
          templateStats.set(templateId, {
            id: templateId,
            name: templateName,
            usageCount: 0,
            totalTime: 0,
            successCount: 0
          });
        }
        
        const stats = templateStats.get(templateId)!;
        stats.usageCount++;
        if (exec.status === 'completed') {
          stats.successCount++;
          if (exec.started_at && exec.completed_at) {
            const duration = (new Date(exec.completed_at).getTime() - new Date(exec.started_at).getTime()) / (1000 * 60);
            stats.totalTime += duration;
          }
        }
      }
    });

    const templatePerformance = Array.from(templateStats.values()).map(template => ({
      ...template,
      avgCompletionTime: template.usageCount > 0 ? template.totalTime / template.usageCount : 0,
      successRate: template.usageCount > 0 ? (template.successCount / template.usageCount) * 100 : 0
    }));

    // Mock quality data (in a real implementation, this would come from quality assessments)
    const qualityIssues = [
      { type: 'Surface Preparation', count: 12, percentage: 35 },
      { type: 'Film Application', count: 8, percentage: 23 },
      { type: 'Edge Trimming', count: 6, percentage: 18 },
      { type: 'Final Inspection', count: 4, percentage: 12 },
      { type: 'Other', count: 4, percentage: 12 }
    ];

    const qualityImprovements = [
      { metric: 'Completion Rate', before: 75, after: 85, improvement: 13.3 },
      { metric: 'Average Time', before: 240, after: 210, improvement: 12.5 },
      { metric: 'Quality Score', before: 7.2, after: 8.1, improvement: 12.5 },
      { metric: 'Customer Satisfaction', before: 8.0, after: 8.7, improvement: 8.8 }
    ];

    const analyticsData = {
      overview: {
        totalTasks,
        completedTasks,
        activeTasks,
        totalUsers: users?.length || 0,
        avgCompletionTime,
        completionRate,
        qualityScore
      },
      trends: {
        daily: dailyTrends,
        weekly: weeklyTrends,
        monthly: monthlyTrends
      },
      performance: {
        technicians: technicianPerformance,
        templates: templatePerformance
      },
      quality: {
        issues: qualityIssues,
        improvements: qualityImprovements
      }
    };

    return NextResponse.json(analyticsData);

  } catch (error) {
    console.error('Error in GET /api/analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
