// Task history service
import { ipcClient } from '@/lib/ipc';
import { AuthSecureStorage } from '@/lib/secureStorage';

export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  action: string;
  userId: string;
  timestamp: Date;
  details?: unknown;
}

export interface TaskHistorySummary {
  totalEntries: number;
  lastUpdated?: Date;
  actions: string[];
}

export class TaskHistoryService {
  private static instance: TaskHistoryService;

  static getInstance(): TaskHistoryService {
    if (!TaskHistoryService.instance) {
      TaskHistoryService.instance = new TaskHistoryService();
    }
    return TaskHistoryService.instance;
  }

  private static async getSessionToken(): Promise<string> {
    const session = await AuthSecureStorage.getSession();
    if (!session.token) {
      throw new Error('Authentication required');
    }
    return session.token;
  }

  private static mapEventToHistoryEntry(event: Record<string, unknown>, taskId: string): TaskHistoryEntry {
    return {
      id: String(event.id || ''),
      taskId,
      action: String(event.event_type || event.action || 'unknown'),
      userId: String(event.user_id || event.actor_id || ''),
      timestamp: event.timestamp ? new Date(String(event.timestamp)) : (event.created_at ? new Date(String(event.created_at)) : new Date()),
      details: event.details || event.metadata || undefined,
    };
  }

  async getTaskHistory(filters: {
    taskId?: string;
    startDate?: string;
    endDate?: string;
    actionType?: string;
  } = {}): Promise<{ history: TaskHistoryEntry[]; totalCount: number; hasMore: boolean }> {
    try {
      const token = await TaskHistoryService.getSessionToken();

      // Use security events as audit trail for task history
      const events = await ipcClient.security.getEvents(100, token);
      const allEvents = (Array.isArray(events) ? events : []) as Array<Record<string, unknown>>;

      let history = allEvents
        .filter(e => {
          if (filters.taskId && String(e.resource_id || e.task_id || '') !== filters.taskId) return false;
          if (filters.actionType && String(e.event_type || e.action || '') !== filters.actionType) return false;
          if (filters.startDate) {
            const eventDate = new Date(String(e.timestamp || e.created_at || ''));
            if (eventDate < new Date(filters.startDate)) return false;
          }
          if (filters.endDate) {
            const eventDate = new Date(String(e.timestamp || e.created_at || ''));
            if (eventDate > new Date(filters.endDate)) return false;
          }
          return true;
        })
        .map(e => TaskHistoryService.mapEventToHistoryEntry(e, filters.taskId || String(e.resource_id || e.task_id || '')));

      // If filtering by taskId but no events found, try to build history from task data
      if (filters.taskId && history.length === 0) {
        const task = await ipcClient.tasks.get(filters.taskId, token);
        if (task) {
          const raw = task as unknown as Record<string, unknown>;
          history = [{
            id: `fallback-history-${filters.taskId}`,
            taskId: filters.taskId,
            action: 'created',
            userId: String(raw.created_by || raw.technician_id || ''),
            timestamp: raw.created_at ? new Date(String(raw.created_at)) : new Date(),
            details: { status: raw.status },
          }];
        }
      }

      return {
        history,
        totalCount: history.length,
        hasMore: false
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch task history');
    }
  }

  static async getTaskHistory(taskId: string): Promise<TaskHistoryEntry[]> {
    try {
      const instance = TaskHistoryService.getInstance();
      const result = await instance.getTaskHistory({ taskId });
      return result.history;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch task history');
    }
  }

  static async getTaskTimeline(taskId: string): Promise<TaskHistoryEntry[]> {
    return this.getTaskHistory(taskId);
  }

  static async getTaskHistorySummary(taskId: string): Promise<TaskHistorySummary> {
    try {
      const history = await this.getTaskHistory(taskId);
      return {
        totalEntries: history.length,
        lastUpdated: history[0]?.timestamp,
        actions: history.map(h => h.action),
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch task history summary');
    }
  }
}

export const taskHistoryService = TaskHistoryService;
