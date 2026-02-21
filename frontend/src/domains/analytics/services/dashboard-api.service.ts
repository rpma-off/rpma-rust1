// Dashboard API service

import { TaskQuery } from '@/lib/backend';
import { UserAccount } from '@/lib/types';
import { ipcClient } from '@/lib/ipc';
import { AuthSecureStorage } from '@/lib/secureStorage';
import { calculateTaskProgress, isTaskOverdue } from '@/types/task.types';

export interface UserProfile extends UserAccount {
  // Additional profile fields can be added here
  name?: string;
  profile?: Record<string, unknown>;
}

export interface TechnicianSummary {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalClients: number;
  activeClients: number;
  systemHealth: 'good' | 'warning' | 'error';
}

export interface DashboardFilters {
  isAdmin: boolean;
  userId: string;
  selectedTechnicianId?: string;
  status?: string;
  search?: string;
}

export interface DashboardData {
  tasks: import('@/types/task.types').TaskWithDetails[];
  stats: DashboardStats;
  lastUpdated: string;
}

export interface ApiResult<T = unknown> {
  data?: T;
  error?: { message: string; code?: string };
  status?: number;
}

export interface CacheStats {
  size: number;
  hitRate: number;
  lastCleared: string;
}

export class DashboardApiService {
  private static cache = new Map<string, { data: unknown; timestamp: number }>();
  private static cacheStats: CacheStats = {
    size: 0,
    hitRate: 0,
    lastCleared: new Date().toISOString()
  };

  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      const stats = await ipcClient.dashboard.getStats();

      // Transform from backend format to dashboard format
      return {
        totalTasks: stats.tasks?.total || 0,
        completedTasks: stats.tasks?.completed || 0,
        pendingTasks: stats.tasks?.pending || 0,
        totalClients: stats.clients?.total || 0,
        activeClients: stats.clients?.active || 0,
        systemHealth: stats.sync?.status === 'online' ? 'good' : 'warning',
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch dashboard stats');
    }
  }

  static async getRecentActivity(): Promise<Array<{
  id: number;
  type: string;
  message: string;
  timestamp: Date;
}>> {
    try {
      // Mock recent activity
      return [
        { id: 1, type: 'task_completed', message: 'Task #123 completed', timestamp: new Date() },
        { id: 2, type: 'client_added', message: 'New client added', timestamp: new Date() },
      ];
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch recent activity');
    }
  }

  static async getDashboardData(filters: DashboardFilters, sessionToken?: string): Promise<ApiResult<DashboardData>> {
    try {
      const cacheKey = `dashboard_${JSON.stringify(filters)}`;
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes cache
        this.cacheStats.hitRate = (this.cacheStats.hitRate + 1) / 2;
        return { data: cached.data as DashboardData };
      }

      // Get session token for authentication
      let token = sessionToken;
      if (!token) {
        const session = await AuthSecureStorage.getSession();
        token = session.token || undefined;
      }

      if (!token) {
        return {
          error: {
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
          },
          status: 401
        };
      }

      // Prepare task query for recent tasks
      const taskQuery: TaskQuery = {
        page: 1,
        limit: 10, // Get 10 recent tasks
        status: null, // No status filter - show all
        technician_id: filters.selectedTechnicianId || null,
        client_id: null,
        priority: null,
        search: filters.search || null,
        from_date: null,
        to_date: null,
        sort_by: 'created_at',
        sort_order: 'desc' // Most recent first
      };

      // Fetch tasks and stats in parallel
      const [taskListResponse, statsResponse] = await Promise.all([
        ipcClient.tasks.list(taskQuery, token),
        ipcClient.dashboard.getStats()
      ]);

      // Transform the data
      const backendTasks = taskListResponse.data || [];
      const tasks: import('@/types/task.types').TaskWithDetails[] = backendTasks.map(task => ({
        ...task,
        progress: calculateTaskProgress({
          ...(task as import('@/types/task.types').TaskWithDetails),
          progress: 0,
          is_overdue: false,
          checklist_completed: Boolean(task.checklist_completed),
        }),
        is_overdue: isTaskOverdue(task)
      }));
      const statsData = statsResponse || {};

      // Transform stats from backend format to dashboard format
      const stats: DashboardStats = {
        totalTasks: statsData.tasks?.total || tasks.length,
        completedTasks: statsData.tasks?.completed || 0,
        pendingTasks: statsData.tasks?.pending || 0,
        totalClients: statsData.clients?.total || 0,
        activeClients: statsData.clients?.active || 0,
        systemHealth: statsData.sync?.status === 'online' ? 'good' : 'warning'
      };

      const dashboardData: DashboardData = {
        tasks,
        stats,
        lastUpdated: new Date().toISOString()
      };

      this.cache.set(cacheKey, { data: dashboardData, timestamp: Date.now() });
      this.cacheStats.size = this.cache.size;

      return { data: dashboardData };
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
          code: 'DASHBOARD_FETCH_ERROR'
        },
        status: 500
      };
    }
  }

  static async getTechnicians(): Promise<ApiResult<TechnicianSummary[]>> {
    try {
      // Mock technicians data
      const technicians = [
        { id: '1', name: 'John Doe', email: 'john@example.com', role: 'technician' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'technician' },
      ];

      return { data: technicians };
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch technicians',
          code: 'TECHNICIANS_FETCH_ERROR'
        },
        status: 500
      };
    }
  }

  static clearCache(): void {
    this.cache.clear();
    this.cacheStats = {
      size: 0,
      hitRate: 0,
      lastCleared: new Date().toISOString()
    };
  }

  static getCacheStats(): CacheStats {
    return { ...this.cacheStats };
  }
}

export const dashboardApiService = DashboardApiService;
