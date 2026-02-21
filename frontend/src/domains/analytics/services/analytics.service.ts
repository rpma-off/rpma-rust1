// Analytics service
import { ipcClient } from '@/lib/ipc';
import { ServiceResponse } from '@/types/unified.types';
import type { ReportFilters } from '@/lib/backend';

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
        ipcClient.system.healthCheck().catch(() => null),
      ]);

      const tasks = dashboardStats?.tasks;
      const healthStr = typeof healthStatus === 'string' ? healthStatus : null;

      const data: AnalyticsData = {
        totalTasks: tasks?.total ?? 0,
        completedTasks: tasks?.completed ?? 0,
        pendingTasks: tasks?.pending ?? 0,
        systemHealth: healthStr === 'error' ? 'error' : healthStr === 'warning' ? 'warning' : 'good',
        uptime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
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
        start: thirtyDaysAgo.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
      };
      const filters: ReportFilters = {
        technician_ids: technicianId ? [technicianId] : null,
        client_ids: null,
        statuses: null,
        priorities: null,
        ppf_zones: null,
        vehicle_models: null,
      };

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
        start: thirtyDaysAgo.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
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
