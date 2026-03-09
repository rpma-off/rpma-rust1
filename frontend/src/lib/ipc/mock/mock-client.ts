import type {
  UserSession,
  Task,
  Client,
  TaskListResponse,
  ClientListResponse,
  TaskStatistics,
  ClientStatistics
} from '@/lib/backend';
import type { Material, MaterialStats } from '@/shared/types';
import type { JsonObject } from '@/types/json';
import { handleInvoke, resetDb } from './mock-db';
import { installMockControls } from './mock-controls';
import { defaultFixtures } from './fixtures';

const mockSafeInvoke = <T>(command: string, args?: JsonObject) =>
  handleInvoke(command, args) as Promise<T>;

export const ipcClient = {
  auth: {
    login: (email: string, password: string) =>
      mockSafeInvoke<UserSession>('auth_login', { request: { email, password } }),
    createAccount: (request: JsonObject) =>
      mockSafeInvoke<UserSession>('auth_create_account', { request }),
    refreshToken: (refreshToken: string) =>
      mockSafeInvoke<UserSession>('auth_refresh_token', { refreshToken }),
    logout: (token: string) =>
      mockSafeInvoke<void>('auth_logout', { token }),
    validateSession: (token: string) =>
      mockSafeInvoke<UserSession>('auth_validate_session', { token }),
    enable2FA: (_sessionToken: string) => mockSafeInvoke('enable_2fa'),
    verify2FASetup: (_code: string, _backupCodes: string[], _sessionToken: string) => mockSafeInvoke('verify_2fa_setup'),
    disable2FA: (_password: string, _sessionToken: string) => mockSafeInvoke('disable_2fa'),
    regenerateBackupCodes: (_sessionToken: string) => mockSafeInvoke('regenerate_backup_codes'),
    is2FAEnabled: (_sessionToken: string) => mockSafeInvoke('is_2fa_enabled')
  },
  clients: {
    create: (data: JsonObject, sessionToken: string) =>
      mockSafeInvoke<Client>('client_crud', { request: { action: { action: 'Create', data }, session_token: sessionToken } }),
    get: (id: string, sessionToken: string) =>
      mockSafeInvoke<Client | null>('client_crud', { request: { action: { action: 'Get', id }, session_token: sessionToken } }),
    getWithTasks: (id: string, sessionToken: string) =>
      mockSafeInvoke<Client | null>('client_crud', { request: { action: { action: 'GetWithTasks', id }, session_token: sessionToken } }),
    search: (query: string, limit: number, sessionToken: string) =>
      mockSafeInvoke<Client[]>('client_crud', { request: { action: { action: 'Search', query, limit }, session_token: sessionToken } }),
    list: (filters: JsonObject, sessionToken: string) =>
      mockSafeInvoke<ClientListResponse>('client_crud', { request: { action: { action: 'List', filters }, session_token: sessionToken } }),
    listWithTasks: (filters: JsonObject, limitTasks: number, sessionToken: string) =>
      mockSafeInvoke<Client[]>('client_crud', { request: { action: { action: 'ListWithTasks', filters, limit_tasks: limitTasks }, session_token: sessionToken } }),
    stats: (sessionToken: string) =>
      mockSafeInvoke<ClientStatistics>('client_crud', { request: { action: { action: 'Stats' }, session_token: sessionToken } }),
    update: (id: string, data: JsonObject, sessionToken: string) =>
      mockSafeInvoke<Client>('client_crud', { request: { action: { action: 'Update', id, data }, session_token: sessionToken } }),
    delete: (id: string, sessionToken: string) =>
      mockSafeInvoke<void>('client_crud', { request: { action: { action: 'Delete', id }, session_token: sessionToken } })
  },
  tasks: {
    create: (data: JsonObject, sessionToken: string) =>
      mockSafeInvoke<Task>('task_crud', { request: { action: { action: 'Create', data }, session_token: sessionToken } }),
    get: (id: string, sessionToken: string) =>
      mockSafeInvoke<Task | null>('task_crud', { request: { action: { action: 'Get', id }, session_token: sessionToken } }),
    update: (id: string, data: JsonObject, sessionToken: string) =>
      mockSafeInvoke<Task>('task_crud', { request: { action: { action: 'Update', id, data }, session_token: sessionToken } }),
    list: (filters: JsonObject, sessionToken: string) =>
      mockSafeInvoke<TaskListResponse>('task_crud', { request: { action: { action: 'List', filters }, session_token: sessionToken } }),
    delete: (id: string, sessionToken: string) =>
      mockSafeInvoke<void>('task_crud', { request: { action: { action: 'Delete', id }, session_token: sessionToken } }),
    statistics: (sessionToken: string) =>
      mockSafeInvoke<TaskStatistics>('task_crud', { request: { action: { action: 'GetStatistics' }, session_token: sessionToken } }),
    checkTaskAssignment: (_taskId: string, _userId: string, _sessionToken: string) => mockSafeInvoke('check_task_assignment'),
    checkTaskAvailability: (_taskId: string, _sessionToken: string) => mockSafeInvoke('check_task_availability'),
    validateTaskAssignmentChange: (_taskId: string, _oldUserId: string | null, _newUserId: string, _sessionToken: string) => mockSafeInvoke('validate_task_assignment_change'),
    editTask: (taskId: string, updates: JsonObject, sessionToken: string) =>
      mockSafeInvoke<Task>('edit_task', { request: { task_id: taskId, data: updates, session_token: sessionToken } }),
    addTaskNote: () => mockSafeInvoke('add_task_note'),
    sendTaskMessage: () => mockSafeInvoke('send_task_message'),
    delayTask: () => mockSafeInvoke('delay_task'),
    reportTaskIssue: () => mockSafeInvoke('report_task_issue'),
    exportTasksCsv: () => mockSafeInvoke<string>('export_tasks_csv'),
    importTasksBulk: () => mockSafeInvoke('import_tasks_bulk')
  },
  intervention: {
    getActiveByTask: (taskId: string, sessionToken: string) =>
      mockSafeInvoke('intervention_get_active_by_task', { task_id: taskId, session_token: sessionToken }),
    saveStepProgress: (request: JsonObject, sessionToken: string, correlationId?: string) =>
      mockSafeInvoke('intervention_save_step_progress', { request, session_token: sessionToken, correlation_id: correlationId }),
    getStep: (stepId: string, sessionToken: string) =>
      mockSafeInvoke('intervention_get_step', { step_id: stepId, session_token: sessionToken }),
    getProgress: (interventionId: string, sessionToken: string) =>
      mockSafeInvoke('intervention_get_progress', { intervention_id: interventionId, session_token: sessionToken })
  },
  interventions: {
    start: (data: JsonObject, sessionToken: string) =>
      mockSafeInvoke('intervention_workflow', { action: { action: 'Start', data }, session_token: sessionToken }),
    get: (id: string, sessionToken: string) =>
      mockSafeInvoke('intervention_workflow', { action: { action: 'Get', id }, session_token: sessionToken }),
    getActiveByTask: (taskId: string, sessionToken: string) =>
      mockSafeInvoke('intervention_get_active_by_task', { task_id: taskId, session_token: sessionToken }),
    getLatestByTask: (taskId: string, sessionToken: string) =>
      mockSafeInvoke('intervention_get_latest_by_task', { taskId, sessionToken }),
    advanceStep: (request: JsonObject, sessionToken: string) =>
      mockSafeInvoke('intervention_progress', { action: { action: 'AdvanceStep', ...request }, session_token: sessionToken }),
    saveStepProgress: (request: JsonObject, sessionToken: string, correlationId: string) =>
      mockSafeInvoke('intervention_save_step_progress', { request, session_token: sessionToken, correlation_id: correlationId }),
    getStep: (stepId: string, sessionToken: string) =>
      mockSafeInvoke('intervention_get_step', { step_id: stepId, session_token: sessionToken }),
    getProgress: (interventionId: string, sessionToken: string) =>
      mockSafeInvoke('intervention_get_progress', { intervention_id: interventionId, session_token: sessionToken }),
    updateWorkflow: (id: string, data: JsonObject, sessionToken: string) =>
      mockSafeInvoke('intervention_workflow', { action: { action: 'Update', id, data }, session_token: sessionToken }),
    finalize: (data: JsonObject, sessionToken: string) =>
      mockSafeInvoke('intervention_workflow', { action: { action: 'Finalize', data }, session_token: sessionToken }),
    list: (filters: JsonObject, sessionToken: string) =>
      mockSafeInvoke('intervention_management', { action: { List: { filters } }, session_token: sessionToken })
  },
  notifications: {
    initialize: (config: JsonObject, sessionToken: string) =>
      mockSafeInvoke('initialize_notification_service', { config, session_token: sessionToken }),
    send: (request: JsonObject, sessionToken: string) =>
      mockSafeInvoke('send_notification', { request, session_token: sessionToken }),
    testConfig: (recipient: string, channel: 'Email' | 'Sms' | 'Push', sessionToken: string) =>
      mockSafeInvoke('test_notification_config', { recipient, channel, session_token: sessionToken }),
    getStatus: (sessionToken: string) =>
      mockSafeInvoke('get_notification_status', { session_token: sessionToken }),
    getRecentActivities: (sessionToken: string) =>
      mockSafeInvoke('get_recent_activities', { session_token: sessionToken })
  },
  settings: {
    getAppSettings: (sessionToken?: string) =>
      mockSafeInvoke('get_app_settings', { sessionToken: sessionToken || '' }),
    updateNotificationSettings: (request: JsonObject, sessionToken: string) =>
      mockSafeInvoke('update_notification_settings', { request: { ...request, session_token: sessionToken } }),
    getUserSettings: (sessionToken: string) =>
      mockSafeInvoke('get_user_settings', { sessionToken }),
    updateUserProfile: (request: JsonObject, sessionToken: string) =>
      mockSafeInvoke('update_user_profile', { request: { ...request, session_token: sessionToken } }),
    updateUserPreferences: (request: JsonObject, sessionToken: string) =>
      mockSafeInvoke('update_user_preferences', { request: { ...request, session_token: sessionToken } }),
    updateUserSecurity: (request: JsonObject, sessionToken: string) =>
      mockSafeInvoke('update_user_security', { request: { ...request, session_token: sessionToken } }),
    updateUserPerformance: (request: JsonObject, sessionToken: string) =>
      mockSafeInvoke('update_user_performance', { request, sessionToken }),
    updateUserAccessibility: (request: JsonObject, sessionToken: string) =>
      mockSafeInvoke('update_user_accessibility', { request: { ...request, session_token: sessionToken } }),
    updateUserNotifications: (request: JsonObject, sessionToken: string) =>
      mockSafeInvoke('update_user_notifications', { request: { ...request, session_token: sessionToken } }),
    changeUserPassword: (request: JsonObject, sessionToken: string) =>
      mockSafeInvoke('change_user_password', { request: { ...request, session_token: sessionToken } }),
    getActiveSessions: (sessionToken: string) =>
      mockSafeInvoke('get_active_sessions', { sessionToken }),
    revokeSession: (sessionId: string, sessionToken: string) =>
      mockSafeInvoke('revoke_session', { sessionId, sessionToken }),
    revokeAllSessionsExceptCurrent: (sessionToken: string) =>
      mockSafeInvoke('revoke_all_sessions_except_current', { sessionToken }),
    updateSessionTimeout: (timeoutMinutes: number, sessionToken: string) =>
      mockSafeInvoke('update_session_timeout', { timeoutMinutes, sessionToken }),
    getSessionTimeoutConfig: (sessionToken: string) =>
      mockSafeInvoke('get_session_timeout_config', { sessionToken }),
    uploadUserAvatar: (fileData: string, fileName: string, mimeType: string, sessionToken: string) =>
      mockSafeInvoke('upload_user_avatar', {
        request: { avatar_data: fileData, mime_type: mimeType, session_token: sessionToken }
      }),
    exportUserData: (sessionToken: string) =>
      mockSafeInvoke('export_user_data', { sessionToken }),
    deleteUserAccount: (confirmation: string, sessionToken: string) =>
      mockSafeInvoke('delete_user_account', { request: { confirmation, session_token: sessionToken } }),
    getDataConsent: (sessionToken: string) =>
      mockSafeInvoke('get_data_consent', { sessionToken }),
    updateDataConsent: (request: JsonObject, sessionToken: string) =>
      mockSafeInvoke('update_data_consent', { request: { ...request, session_token: sessionToken } })
  },
  material: {
    list: (sessionToken: string, query: JsonObject) =>
      mockSafeInvoke<Material[]>('material_list', { sessionToken, ...query }),
    create: (data: JsonObject, sessionToken: string) =>
      mockSafeInvoke<Material>('material_create', { request: { ...data, session_token: sessionToken } }),
    update: (id: string, data: JsonObject, sessionToken: string) =>
      mockSafeInvoke<Material>('material_update', { id, request: { ...data, session_token: sessionToken } }),
    get: (id: string, sessionToken: string) =>
      mockSafeInvoke<Material | null>('material_get', { id, sessionToken }),
    delete: (id: string, sessionToken: string) =>
      mockSafeInvoke('material_delete', { id, sessionToken }),
    updateStock: (data: JsonObject, sessionToken: string) =>
      mockSafeInvoke('material_update_stock', { request: { ...data, session_token: sessionToken } }),
    adjustStock: (data: JsonObject, sessionToken: string) =>
      mockSafeInvoke('material_adjust_stock', { request: { ...data, session_token: sessionToken } }),
    recordConsumption: (data: JsonObject, sessionToken: string) =>
      mockSafeInvoke('material_record_consumption', { request: { ...data, session_token: sessionToken } }),
    getConsumptionHistory: () => mockSafeInvoke('material_get_consumption_history'),
    createInventoryTransaction: () => mockSafeInvoke('material_create_inventory_transaction'),
    getTransactionHistory: () => mockSafeInvoke('material_get_transaction_history'),
    createCategory: (data: JsonObject, sessionToken: string) =>
      mockSafeInvoke('material_create_category', { request: { ...data, session_token: sessionToken } }),
    listCategories: (sessionToken: string) =>
      mockSafeInvoke('material_list_categories', { sessionToken }),
    createSupplier: (data: JsonObject, sessionToken: string) =>
      mockSafeInvoke('material_create_supplier', { request: { ...data, session_token: sessionToken } }),
    listSuppliers: (sessionToken: string) =>
      mockSafeInvoke('material_list_suppliers', { sessionToken }),
    getStats: (_sessionToken: string) =>
      mockSafeInvoke<MaterialStats>('material_get_stats'),
    getLowStockMaterials: (_sessionToken: string) =>
      mockSafeInvoke<Material[]>('material_get_low_stock'),
    getExpiredMaterials: (_sessionToken: string) =>
      mockSafeInvoke<Material[]>('material_get_expired_materials'),
    getInventoryMovementSummary: () => mockSafeInvoke('material_get_inventory_movement_summary')
  },
  calendar: {
    getEvents: (startDate: string, endDate: string, technicianId: string | undefined, sessionToken: string) =>
      mockSafeInvoke('get_events', { start_date: startDate, end_date: endDate, technician_id: technicianId, session_token: sessionToken }),
    getEventById: (id: string, sessionToken: string) =>
      mockSafeInvoke('get_event_by_id', { id, session_token: sessionToken }),
    createEvent: (eventData: JsonObject, sessionToken: string) =>
      mockSafeInvoke('create_event', { event_data: eventData, session_token: sessionToken }),
    updateEvent: (id: string, eventData: JsonObject, sessionToken: string) =>
      mockSafeInvoke('update_event', { id, event_data: eventData, session_token: sessionToken }),
    deleteEvent: (id: string, sessionToken: string) =>
      mockSafeInvoke('delete_event', { id, session_token: sessionToken }),
    getEventsForTechnician: (technicianId: string, sessionToken: string) =>
      mockSafeInvoke('get_events_for_technician', { technician_id: technicianId, session_token: sessionToken }),
    getEventsForTask: (taskId: string, sessionToken: string) =>
      mockSafeInvoke('get_events_for_task', { task_id: taskId, session_token: sessionToken })
  },
  dashboard: {
    getStats: (sessionToken: string, timeRange?: string) =>
      mockSafeInvoke('dashboard_get_stats', { session_token: sessionToken, timeRange })
  },
  users: {
    create: (data: JsonObject, sessionToken: string) =>
      mockSafeInvoke('user_crud', { request: { action: { action: 'Create', data }, session_token: sessionToken } }),
    get: (id: string, sessionToken: string) =>
      mockSafeInvoke('user_crud', { request: { action: { action: 'Get', id }, session_token: sessionToken } }),
    list: (limit: number, offset: number, sessionToken: string) =>
      mockSafeInvoke('user_crud', { request: { action: { action: 'List', limit, offset }, session_token: sessionToken } }),
    update: (id: string, data: JsonObject, sessionToken: string) =>
      mockSafeInvoke('user_crud', { request: { action: { action: 'Update', id, data }, session_token: sessionToken } }),
    delete: (id: string, sessionToken: string) =>
      mockSafeInvoke('user_crud', { request: { action: { action: 'Delete', id }, session_token: sessionToken } }),
    changeRole: (userId: string, newRole: string, sessionToken: string) =>
      mockSafeInvoke('user_crud', { request: { action: { ChangeRole: { id: userId, new_role: newRole } }, session_token: sessionToken } }),
    updateEmail: (userId: string, newEmail: string, sessionToken: string) =>
      mockSafeInvoke('user_crud', { request: { action: { action: 'Update', id: userId, data: { email: newEmail } }, session_token: sessionToken } }),
    changePassword: (userId: string, newPassword: string, sessionToken: string) =>
      mockSafeInvoke('user_crud', { request: { action: { ChangePassword: { id: userId, new_password: newPassword } }, session_token: sessionToken } }),
    banUser: (userId: string, sessionToken: string) =>
      mockSafeInvoke('user_crud', { request: { action: { Ban: { id: userId } }, session_token: sessionToken } }),
    unbanUser: (userId: string, sessionToken: string) =>
      mockSafeInvoke('user_crud', { request: { action: { Unban: { id: userId } }, session_token: sessionToken } })
  },
  bootstrap: {
    firstAdmin: (userId: string, sessionToken: string) =>
      mockSafeInvoke('bootstrap_first_admin', { request: { user_id: userId, session_token: sessionToken } }),
    hasAdmins: () =>
      mockSafeInvoke('has_admins')
  },
  sync: {
    start: () => mockSafeInvoke('sync_start_background_service'),
    stop: () => mockSafeInvoke('sync_stop_background_service'),
    getStatus: () => mockSafeInvoke('sync_get_status'),
    syncNow: () => mockSafeInvoke('sync_now'),
    getOperationsForEntity: () => mockSafeInvoke('sync_get_operations_for_entity')
  },
  performance: {
    getStats: (sessionToken: string) =>
      mockSafeInvoke('get_performance_stats', { session_token: sessionToken }),
    getMetrics: (limit: number, sessionToken: string) =>
      mockSafeInvoke('get_performance_metrics', { limit, session_token: sessionToken }),
    cleanupMetrics: (sessionToken: string) =>
      mockSafeInvoke('cleanup_performance_metrics', { session_token: sessionToken }),
    getCacheStatistics: (sessionToken: string) =>
      mockSafeInvoke('get_cache_statistics', { session_token: sessionToken }),
    clearApplicationCache: (request: JsonObject, sessionToken: string) =>
      mockSafeInvoke('clear_application_cache', { request, session_token: sessionToken }),
    configureCacheSettings: (request: JsonObject, sessionToken: string) =>
      mockSafeInvoke('configure_cache_settings', { request, session_token: sessionToken })
  },
  security: {
    getMetrics: (sessionToken: string) =>
      mockSafeInvoke('get_security_metrics', { session_token: sessionToken }),
    getEvents: (limit: number, sessionToken: string) =>
      mockSafeInvoke('get_security_events', { limit, session_token: sessionToken }),
    getAlerts: (sessionToken: string) =>
      mockSafeInvoke('get_security_alerts', { session_token: sessionToken }),
    acknowledgeAlert: (alertId: string, sessionToken: string) =>
      mockSafeInvoke('acknowledge_security_alert', { alert_id: alertId, session_token: sessionToken }),
    resolveAlert: (alertId: string, actionsTaken: string[], sessionToken: string) =>
      mockSafeInvoke('resolve_security_alert', { alert_id: alertId, actions_taken: actionsTaken, session_token: sessionToken }),
    cleanupEvents: (sessionToken: string) =>
      mockSafeInvoke('cleanup_security_events', { session_token: sessionToken }),
    getActiveSessions: (sessionToken: string) =>
      mockSafeInvoke('get_active_sessions', { sessionToken }),
    revokeSession: (sessionId: string, sessionToken: string) =>
      mockSafeInvoke('revoke_session', { sessionId, sessionToken }),
    revokeAllSessionsExceptCurrent: (sessionToken: string) =>
      mockSafeInvoke('revoke_all_sessions_except_current', { sessionToken }),
    updateSessionTimeout: (timeoutMinutes: number, sessionToken: string) =>
      mockSafeInvoke('update_session_timeout', { timeoutMinutes, sessionToken }),
    getSessionTimeoutConfig: (sessionToken: string) =>
      mockSafeInvoke('get_session_timeout_config', { sessionToken })
  },
  system: {
    healthCheck: () => mockSafeInvoke('health_check'),
    getDatabaseStatus: (sessionToken: string) => mockSafeInvoke('diagnose_database', { session_token: sessionToken }),
    getDatabaseStats: (sessionToken: string) => mockSafeInvoke('get_database_stats', { session_token: sessionToken }),
    getDatabasePoolStats: () => mockSafeInvoke('get_database_pool_stats'),
    getAppInfo: () => mockSafeInvoke('get_app_info'),
    vacuumDatabase: (sessionToken: string) => mockSafeInvoke('vacuum_database', { session_token: sessionToken })
  },
  ui: {
    windowMinimize: () => mockSafeInvoke('ui_window_minimize'),
    windowMaximize: () => mockSafeInvoke('ui_window_maximize'),
    windowClose: () => mockSafeInvoke('ui_window_close'),
    navigate: (path: string, options?: JsonObject) => mockSafeInvoke('navigation_update', { path, options }),
    goBack: () => mockSafeInvoke('navigation_go_back'),
    goForward: () => mockSafeInvoke('navigation_go_forward'),
    getCurrent: () => mockSafeInvoke('navigation_get_current'),
    addToHistory: (path: string) => mockSafeInvoke('navigation_add_to_history', { path }),
    registerShortcuts: () => mockSafeInvoke('shortcuts_register'),
    shellOpen: () => mockSafeInvoke('ui_shell_open_url'),
    gpsGetCurrentPosition: () => mockSafeInvoke('ui_gps_get_current_position'),
    initiateCustomerCall: () => mockSafeInvoke('ui_initiate_customer_call')
  }
} as const;

export function useIpcClient() {
  return ipcClient;
}

export function initMockIpc(): void {
  console.log('[E2E Mock] Initializing IPC mock...');
  installMockControls();
  // Initialize the mock database with default fixtures
  resetDb(defaultFixtures);
  console.log('[E2E Mock] IPC mock initialized successfully');
}



