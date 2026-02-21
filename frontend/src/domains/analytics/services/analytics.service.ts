// Analytics service
import { ipcClient } from '@/lib/ipc';
import { ServiceResponse } from '@/types/unified.types';

export interface AnalyticsData {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  systemHealth: 'good' | 'warning' | 'error';
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export class AnalyticsService {
  static async getSystemHealth(): Promise<ServiceResponse<AnalyticsData>> {
    try {
      const [dashboardStats, healthStatus] = await Promise.all([
        ipcClient.dashboard.getStats().catch(() => null),
        ipcClient.system.getHealthStatus().catch(() => null),
      ]);

      const tasks = dashboardStats?.tasks;
      const health = healthStatus as Record<string, unknown> | null;

      const data: AnalyticsData = {
        totalTasks: tasks?.total ?? 0,
        completedTasks: tasks?.completed ?? 0,
        pendingTasks: tasks?.pending ?? 0,
        systemHealth: health?.status === 'error' ? 'error' : health?.status === 'warning' ? 'warning' : 'good',
        uptime: typeof health?.uptime === 'number' ? health.uptime : 0,
        memoryUsage: typeof health?.memory_usage === 'number' ? health.memory_usage : 0,
        cpuUsage: typeof health?.cpu_usage === 'number' ? health.cpu_usage : 0,
      };
      return {
        success: true,
        data,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analytics',
        status: 500
      };
    }
  }

  static async getSystemHealthMetrics(): Promise<ServiceResponse<AnalyticsData>> {
    return this.getSystemHealth();
  }

  static async getTaskMetrics(): Promise<ServiceResponse<unknown>> {
    try {
      const dashboardStats = await ipcClient.dashboard.getStats();
      const tasks = dashboardStats?.tasks;

      const data = {
        byStatus: {
          pending: tasks?.pending ?? 0,
          in_progress: tasks?.active ?? 0,
          completed: tasks?.completed ?? 0,
        },
        byPriority: {
          low: 0,
          medium: 0,
          high: 0,
        },
        total: tasks?.total ?? 0,
      };
      return {
        success: true,
        data,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch task metrics',
        status: 500
      };
    }
  }

  static async getTaskStatistics(timeRange: string): Promise<ServiceResponse<unknown>> {
    try {
      const validRanges = ['day', 'week', 'month', 'year'] as const;
      const range = validRanges.includes(timeRange as typeof validRanges[number])
        ? (timeRange as typeof validRanges[number])
        : 'month';

      const dashboardStats = await ipcClient.dashboard.getStats(range);
      const tasks = dashboardStats?.tasks;

      return {
        success: true,
        data: {
          timeRange: range,
          byStatus: {
            pending: tasks?.pending ?? 0,
            in_progress: tasks?.active ?? 0,
            completed: tasks?.completed ?? 0,
          },
          total: tasks?.total ?? 0,
        },
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch task statistics',
        status: 500
      };
    }
  }

  static async getTechnicianPerformance(technicianId?: string): Promise<ServiceResponse<unknown>> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const dateRange = {
        start_date: thirtyDaysAgo.toISOString().split('T')[0],
        end_date: now.toISOString().split('T')[0],
      };
      const filters = technicianId ? { technician_id: technicianId } : {};

      const report = await ipcClient.reports.getTechnicianPerformanceReport(dateRange, filters);
      return {
        success: true,
        data: report,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch technician performance',
        status: 500
      };
    }
  }

  static async getWorkflowAnalytics(): Promise<ServiceResponse<unknown>> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const dateRange = {
        start_date: thirtyDaysAgo.toISOString().split('T')[0],
        end_date: now.toISOString().split('T')[0],
      };

      const report = await ipcClient.reports.getTaskCompletionReport(dateRange);
      return {
        success: true,
        data: report,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch workflow analytics',
        status: 500
      };
    }
  }
}

export const analyticsService = AnalyticsService;
