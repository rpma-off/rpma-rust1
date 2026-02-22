export interface DashboardStats {
  tasks: {
    total: number;
    completed: number;
    pending: number;
    active: number;
    overdue: number;
  };
  clients: {
    total: number;
    active: number;
    new_this_month: number;
  };
  users: {
    total: number;
    active: number;
    admins: number;
    technicians: number;
  };
  sync: {
    status: 'idle' | 'syncing' | 'error';
    pending_operations: number;
    completed_operations: number;
    last_sync: string;
  };
  interventions: {
    total: number;
    in_progress: number;
    completed_today: number;
    upcoming: number;
  };
  inventory: {
    total_materials: number;
    low_stock: number;
    out_of_stock: number;
  };
  last_updated: string;
}

export interface RecentActivity {
  id: string;
  type: 'task' | 'intervention' | 'client' | 'quote' | 'inventory' | 'sync';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
  icon?: string;
}

export interface DashboardWidget {
  id: string;
  type: 'kpi' | 'chart' | 'list' | 'activity';
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, unknown>;
}

export interface DashboardFilter {
  timeRange: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';
  status?: string[];
  priority?: string[];
  assignedTo?: string[];
  team?: string[];
}

export interface DashboardContextValue {
  stats: DashboardStats | null;
  recentActivity: RecentActivity[];
  widgets: DashboardWidget[];
  filters: DashboardFilter;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateFilters: (filters: Partial<DashboardFilter>) => void;
  addWidget: (widget: Omit<DashboardWidget, 'id'>) => void;
  removeWidget: (widgetId: string) => void;
  updateWidget: (widgetId: string, updates: Partial<DashboardWidget>) => void;
}

export type DashboardContext = DashboardContextValue;
