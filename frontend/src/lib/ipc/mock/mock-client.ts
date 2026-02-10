import type {
  UserSession,
  Task,
  Client,
  TaskListResponse,
  ClientListResponse,
  TaskStatistics,
  ClientStatistics
} from '@/lib/backend';
import type { Material, MaterialStats, InventoryStats } from '@/lib/inventory';
import { handleInvoke } from './mock-db';
import { installMockControls } from './mock-controls';

const invoke = <T>(command: string, args?: Record<string, unknown>) =>
  handleInvoke(command, args) as Promise<T>;

export const ipcClient = {
  auth: {
    login: (email: string, password: string) =>
      invoke<UserSession>('auth_login', { request: { email, password } }),
    createAccount: (request: Record<string, unknown>) =>
      invoke<UserSession>('auth_create_account', { request }),
    refreshToken: (refreshToken: string) =>
      invoke<UserSession>('auth_refresh_token', { refreshToken }),
    logout: (token: string) =>
      invoke<void>('auth_logout', { token }),
    validateSession: (token: string) =>
      invoke<UserSession>('auth_validate_session', { token }),
    enable2FA: (_sessionToken: string) => invoke('enable_2fa'),
    verify2FASetup: (_code: string, _backupCodes: string[], _sessionToken: string) => invoke('verify_2fa_setup'),
    disable2FA: (_password: string, _sessionToken: string) => invoke('disable_2fa'),
    regenerateBackupCodes: (_sessionToken: string) => invoke('regenerate_backup_codes'),
    is2FAEnabled: (_sessionToken: string) => invoke('is_2fa_enabled')
  },
  clients: {
    create: (data: Record<string, unknown>, sessionToken: string) =>
      invoke<Client>('client_crud', { request: { action: { action: 'Create', data }, session_token: sessionToken } }),
    get: (id: string, sessionToken: string) =>
      invoke<Client | null>('client_crud', { request: { action: { action: 'Get', id }, session_token: sessionToken } }),
    getWithTasks: (id: string, sessionToken: string) =>
      invoke<Client | null>('client_crud', { request: { action: { action: 'GetWithTasks', id }, session_token: sessionToken } }),
    search: (query: string, limit: number, sessionToken: string) =>
      invoke<Client[]>('client_crud', { request: { action: { action: 'Search', query, limit }, session_token: sessionToken } }),
    list: (filters: Record<string, unknown>, sessionToken: string) =>
      invoke<ClientListResponse>('client_crud', { request: { action: { action: 'List', filters }, session_token: sessionToken } }),
    listWithTasks: (filters: Record<string, unknown>, limitTasks: number, sessionToken: string) =>
      invoke<Client[]>('client_crud', { request: { action: { action: 'ListWithTasks', filters, limit_tasks: limitTasks }, session_token: sessionToken } }),
    stats: (sessionToken: string) =>
      invoke<ClientStatistics>('client_crud', { request: { action: { action: 'Stats' }, session_token: sessionToken } }),
    update: (id: string, data: Record<string, unknown>, sessionToken: string) =>
      invoke<Client>('client_crud', { request: { action: { action: 'Update', id, data }, session_token: sessionToken } }),
    delete: (id: string, sessionToken: string) =>
      invoke<void>('client_crud', { request: { action: { action: 'Delete', id }, session_token: sessionToken } })
  },
  tasks: {
    create: (data: Record<string, unknown>, sessionToken: string) =>
      invoke<Task>('task_crud', { request: { action: { action: 'Create', data }, session_token: sessionToken } }),
    get: (id: string, sessionToken: string) =>
      invoke<Task | null>('task_crud', { request: { action: { action: 'Get', id }, session_token: sessionToken } }),
    update: (id: string, data: Record<string, unknown>, sessionToken: string) =>
      invoke<Task>('task_crud', { request: { action: { action: 'Update', id, data }, session_token: sessionToken } }),
    list: (filters: Record<string, unknown>, sessionToken: string) =>
      invoke<TaskListResponse>('task_crud', { request: { action: { action: 'List', filters }, session_token: sessionToken } }),
    delete: (id: string, sessionToken: string) =>
      invoke<void>('task_crud', { request: { action: { action: 'Delete', id }, session_token: sessionToken } }),
    statistics: (sessionToken: string) =>
      invoke<TaskStatistics>('task_crud', { request: { action: { action: 'GetStatistics' }, session_token: sessionToken } }),
    checkTaskAssignment: (_taskId: string, _userId: string, _sessionToken: string) => invoke('check_task_assignment'),
    checkTaskAvailability: (_taskId: string, _sessionToken: string) => invoke('check_task_availability'),
    validateTaskAssignmentChange: (_taskId: string, _oldUserId: string | null, _newUserId: string, _sessionToken: string) => invoke('validate_task_assignment_change'),
    editTask: (taskId: string, updates: Record<string, unknown>, sessionToken: string) =>
      invoke<Task>('edit_task', { request: { task_id: taskId, data: updates, session_token: sessionToken } }),
    addTaskNote: () => invoke('add_task_note'),
    sendTaskMessage: () => invoke('send_task_message'),
    delayTask: () => invoke('delay_task'),
    reportTaskIssue: () => invoke('report_task_issue'),
    exportTasksCsv: () => invoke<string>('export_tasks_csv'),
    importTasksBulk: () => invoke('import_tasks_bulk')
  },
  intervention: {
    getActiveByTask: (taskId: string, sessionToken: string) =>
      invoke('intervention_get_active_by_task', { task_id: taskId, session_token: sessionToken }),
    saveStepProgress: (request: Record<string, unknown>, sessionToken: string, correlationId: string) =>
      invoke('intervention_save_step_progress', { request, session_token: sessionToken, correlation_id: correlationId }),
    getStep: (stepId: string, sessionToken: string) =>
      invoke('intervention_get_step', { step_id: stepId, session_token: sessionToken }),
    getProgress: (interventionId: string, sessionToken: string) =>
      invoke('intervention_get_progress', { intervention_id: interventionId, session_token: sessionToken })
  },
  material: {
    list: (sessionToken: string, query: Record<string, unknown>) =>
      invoke<Material[]>('material_list', { sessionToken, ...query }),
    create: (data: Record<string, unknown>, sessionToken: string) =>
      invoke<Material>('material_create', { request: { ...data, session_token: sessionToken } }),
    update: (id: string, data: Record<string, unknown>, sessionToken: string) =>
      invoke<Material>('material_update', { id, request: { ...data, session_token: sessionToken } }),
    get: (id: string, sessionToken: string) =>
      invoke<Material | null>('material_get', { id, sessionToken }),
    delete: (id: string, sessionToken: string) =>
      invoke('material_delete', { id, sessionToken }),
    updateStock: (data: Record<string, unknown>, sessionToken: string) =>
      invoke('material_update_stock', { request: { ...data, session_token: sessionToken } }),
    adjustStock: (data: Record<string, unknown>, sessionToken: string) =>
      invoke('material_adjust_stock', { request: { ...data, session_token: sessionToken } }),
    recordConsumption: (data: Record<string, unknown>, sessionToken: string) =>
      invoke('material_record_consumption', { request: { ...data, session_token: sessionToken } }),
    getConsumptionHistory: () => invoke('material_get_consumption_history'),
    createInventoryTransaction: () => invoke('material_create_inventory_transaction'),
    getTransactionHistory: () => invoke('material_get_transaction_history'),
    createCategory: (data: Record<string, unknown>, sessionToken: string) =>
      invoke('material_create_category', { request: { ...data, session_token: sessionToken } }),
    listCategories: (sessionToken: string) =>
      invoke('material_list_categories', { sessionToken }),
    createSupplier: (data: Record<string, unknown>, sessionToken: string) =>
      invoke('material_create_supplier', { request: { ...data, session_token: sessionToken } }),
    listSuppliers: (sessionToken: string) =>
      invoke('material_list_suppliers', { sessionToken }),
    getStats: (_sessionToken: string) =>
      invoke<MaterialStats>('material_get_stats'),
    getLowStockMaterials: (_sessionToken: string) =>
      invoke<Material[]>('material_get_low_stock'),
    getExpiredMaterials: (_sessionToken: string) =>
      invoke<Material[]>('material_get_expired_materials'),
    getInventoryMovementSummary: () => invoke('material_get_inventory_movement_summary')
  },
  reports: {
    getTaskCompletionReport: (dateRange: Record<string, unknown>, filters?: Record<string, unknown>) =>
      invoke('get_task_completion_report', { date_range: dateRange, filters: filters || {} }),
    getTechnicianPerformanceReport: (dateRange: Record<string, unknown>, filters?: Record<string, unknown>) =>
      invoke('get_technician_performance_report', { date_range: dateRange, filters: filters || {} }),
    getClientAnalyticsReport: (dateRange: Record<string, unknown>, filters?: Record<string, unknown>) =>
      invoke('get_client_analytics_report', { date_range: dateRange, filters: filters || {} }),
    getQualityComplianceReport: (dateRange: Record<string, unknown>, filters?: Record<string, unknown>) =>
      invoke('get_quality_compliance_report', { date_range: dateRange, filters: filters || {} }),
    getMaterialUsageReport: (dateRange: Record<string, unknown>, filters?: Record<string, unknown>) =>
      invoke('get_material_usage_report', { date_range: dateRange, filters: filters || {} }),
    getOverviewReport: (dateRange: Record<string, unknown>, filters?: Record<string, unknown>) =>
      invoke('get_overview_report', { date_range: dateRange, filters: filters || {} }),
    exportReport: (reportType: string, dateRange: Record<string, unknown>, filters: Record<string, unknown>, format: string) =>
      invoke('export_report_data', { report_type: reportType, date_range: dateRange, filters, format }),
    exportInterventionReport: (interventionId: string) =>
      invoke('export_intervention_report', { intervention_id: interventionId }),
    saveInterventionReport: (interventionId: string, filePath: string) =>
      invoke('save_intervention_report', { intervention_id: interventionId, file_path: filePath }),
    getReportStatus: (reportId: string) =>
      invoke('get_report_status', { report_id: reportId }),
    cancelReport: (reportId: string) =>
      invoke('cancel_report', { report_id: reportId })
  },
  dashboard: {
    getStats: (timeRange?: string) =>
      invoke('dashboard_get_stats', { timeRange })
  },
  sync: {
    start: () => invoke('sync_start'),
    stop: () => invoke('sync_stop'),
    getStatus: () => invoke('sync_get_status'),
    syncNow: () => invoke('sync_now'),
    getOperationsForEntity: () => invoke('sync_get_operations_for_entity')
  },
  system: {
    healthCheck: () => invoke('health_check'),
    getDatabaseStatus: () => invoke('diagnose_database'),
    getDatabaseStats: () => invoke('get_database_stats'),
    getDatabasePoolStats: () => invoke('get_database_pool_stats'),
    getAppInfo: () => invoke('get_app_info'),
    vacuumDatabase: () => invoke('vacuum_database')
  },
  ui: {
    windowMinimize: () => invoke('ui_window_minimize'),
    windowMaximize: () => invoke('ui_window_maximize'),
    windowClose: () => invoke('ui_window_close'),
    navigate: (path: string, options?: Record<string, unknown>) => invoke('navigation_update', { path, options }),
    goBack: () => invoke('navigation_go_back'),
    goForward: () => invoke('navigation_go_forward'),
    getCurrent: () => invoke('navigation_get_current'),
    addToHistory: (path: string) => invoke('navigation_add_to_history', { path }),
    registerShortcuts: () => invoke('shortcuts_register'),
    shellOpen: () => invoke('ui_shell_open_url'),
    gpsGetCurrentPosition: () => invoke('ui_gps_get_current_position'),
    initiateCustomerCall: () => invoke('ui_initiate_customer_call')
  }
} as const;

export function useIpcClient() {
  return ipcClient;
}

export function initMockIpc(): void {
  installMockControls();
}
