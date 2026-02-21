/**
 * Change Log Service
 * 
 * Service for tracking and managing change logs in the application.
 * Uses the security events IPC to retrieve audit trail data.
 */
import { ipcClient } from '@/lib/ipc';
import { AuthSecureStorage } from '@/lib/secureStorage';

export interface ChangeLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: 'create' | 'update' | 'delete';
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  changed_fields?: string[];
  user_id?: string;
  user_email?: string;
  timestamp: string; // ISO datetime
}

export interface ChangeLogWithUser extends ChangeLogEntry {
  user_name?: string;
  changed_by?: {
    id: string;
    full_name: string;
    email: string;
    user_metadata?: {
      full_name?: string;
    };
  };
  resource_type?: string;
  resource_id?: string;
}

export interface ChangeLogFilters {
  table_name?: string;
  action?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export class ChangeLogService {
  private static instance: ChangeLogService;

  static getInstance(): ChangeLogService {
    if (!ChangeLogService.instance) {
      ChangeLogService.instance = new ChangeLogService();
    }
    return ChangeLogService.instance;
  }

  private async getSessionToken(): Promise<string> {
    const session = await AuthSecureStorage.getSession();
    if (!session.token) {
      throw new Error('Authentication required');
    }
    return session.token;
  }

  private mapEventToChangeLog(event: Record<string, unknown>): ChangeLogWithUser {
    const actionMap: Record<string, 'create' | 'update' | 'delete'> = {
      'created': 'create',
      'updated': 'update',
      'deleted': 'delete',
      'create': 'create',
      'update': 'update',
      'delete': 'delete',
    };

    const rawAction = String(event.event_type || event.action || 'update').toLowerCase();
    const action = actionMap[rawAction] || 'update';

    return {
      id: String(event.id || ''),
      table_name: String(event.resource_type || event.table_name || ''),
      record_id: String(event.resource_id || event.record_id || ''),
      action,
      old_values: event.old_values as Record<string, unknown> | undefined,
      new_values: event.new_values as Record<string, unknown> | undefined,
      changed_fields: Array.isArray(event.changed_fields) ? event.changed_fields.map(String) : undefined,
      user_id: event.user_id ? String(event.user_id) : undefined,
      user_email: event.user_email ? String(event.user_email) : undefined,
      timestamp: String(event.timestamp || event.created_at || new Date().toISOString()),
      user_name: event.user_name ? String(event.user_name) : undefined,
      resource_type: event.resource_type ? String(event.resource_type) : undefined,
      resource_id: event.resource_id ? String(event.resource_id) : undefined,
    };
  }

  async getChangeLogs(filters?: ChangeLogFilters): Promise<ChangeLogWithUser[]> {
    try {
      const token = await this.getSessionToken();
      const events = await ipcClient.security.getEvents(100, token);

      const allEvents = (Array.isArray(events) ? events : []) as Array<Record<string, unknown>>;

      return allEvents
        .filter(e => {
          if (filters?.table_name && String(e.resource_type || '') !== filters.table_name) return false;
          if (filters?.action && String(e.event_type || e.action || '') !== filters.action) return false;
          if (filters?.user_id && String(e.user_id || '') !== filters.user_id) return false;
          if (filters?.start_date) {
            const ts = new Date(String(e.timestamp || e.created_at || ''));
            if (ts < new Date(filters.start_date)) return false;
          }
          if (filters?.end_date) {
            const ts = new Date(String(e.timestamp || e.created_at || ''));
            if (ts > new Date(filters.end_date)) return false;
          }
          if (filters?.search) {
            const searchLower = filters.search.toLowerCase();
            const searchable = JSON.stringify(e).toLowerCase();
            if (!searchable.includes(searchLower)) return false;
          }
          return true;
        })
        .map(e => this.mapEventToChangeLog(e));
    } catch (error) {
      console.error('Error fetching change logs:', error);
      return [];
    }
  }

  async getChangeLogById(id: string): Promise<ChangeLogWithUser | null> {
    try {
      const logs = await this.getChangeLogs();
      return logs.find(log => log.id === id) || null;
    } catch (error) {
      console.error('Error fetching change log:', error);
      return null;
    }
  }

  async createChangeLog(entry: Omit<ChangeLogEntry, 'id' | 'timestamp'>): Promise<ChangeLogEntry> {
    try {
      const newEntry: ChangeLogEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      };
      return newEntry;
    } catch (error) {
      console.error('Error creating change log:', error);
      throw error;
    }
  }

  async getRecordChanges(tableName: string, recordId: string): Promise<ChangeLogWithUser[]> {
    return this.getChangeLogs({ table_name: tableName, search: recordId });
  }

  async getTableChanges(tableName: string): Promise<ChangeLogWithUser[]> {
    return this.getChangeLogs({ table_name: tableName });
  }
}

export const changeLogService = ChangeLogService.getInstance();
