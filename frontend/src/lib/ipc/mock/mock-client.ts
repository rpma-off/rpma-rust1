import type {
  UserSession,
  Task,
  Client,
  TaskListResponse,
  ClientListResponse,
  TaskStatistics,
  ClientStatistics,
  Organization,
  OnboardingStatus,
  OnboardingData,
  UpdateOrganizationRequest,
  UpdateOrganizationSettingsRequest,
  UserSettings,
  UserListResponse
} from '@/lib/backend';
import type { JsonObject, JsonValue } from '@/types/json';
import { handleInvoke, resetDb } from './mock-db';
import { installMockControls } from './mock-controls';

/** Represents a photo file passed to the mock photo upload handler. */
interface PhotoUploadFile {
  name: string;
  mimeType: string;
  bytes: ArrayLike<number>;
}

const mockSafeInvoke = <T>(command: string, args?: JsonObject) =>
  handleInvoke(command, args) as Promise<T>;

export const ipcClient = {
  auth: {
    login: (email: string, password: string) =>
      mockSafeInvoke<UserSession>('auth_login', { request: { email, password } }),
    createAccount: (request: JsonObject) =>
      mockSafeInvoke<UserSession>('auth_create_account', { request }),
    logout: () =>
      mockSafeInvoke<void>('auth_logout', {}),
    validateSession: () =>
      mockSafeInvoke<UserSession>('auth_validate_session', {}),
  },
  clients: {
    create: (data: JsonObject) =>
      mockSafeInvoke<Client>('client_create', { data }),
    get: (id: string) =>
      mockSafeInvoke<Client | null>('client_get', { id }),
    getWithTasks: (id: string) =>
      mockSafeInvoke<Client | null>('client_get_with_tasks', { id }),
    search: (query: string, limit: number) =>
      mockSafeInvoke<Client[]>('client_search', { query, limit }),
    list: (filters: JsonObject) =>
      mockSafeInvoke<ClientListResponse>('client_list', { filters }),
    listWithTasks: (filters: JsonObject, limitTasks: number) =>
      mockSafeInvoke<Client[]>('client_list_with_tasks', { filters, limit_tasks: limitTasks }),
    stats: () =>
      mockSafeInvoke<ClientStatistics>('client_get_stats', {}),
    update: (id: string, data: JsonObject) =>
      mockSafeInvoke<Client>('client_update', { id, data }),
    delete: (id: string) =>
      mockSafeInvoke<void>('client_delete', { id })
  },
  tasks: {
    create: (data: JsonObject) =>
      mockSafeInvoke<Task>('task_create', { data }),
    get: (id: string) =>
      mockSafeInvoke<Task | null>('task_get', { id }),
    update: (id: string, data: JsonObject) =>
      mockSafeInvoke<Task>('task_update', { id, data }),
    list: (filters: JsonObject) =>
      mockSafeInvoke<TaskListResponse>('task_list', { filter: filters }),
    delete: (id: string) =>
      mockSafeInvoke<void>('task_delete', { id }),
    statistics: () =>
      mockSafeInvoke<TaskStatistics>('task_statistics', {}),
    checkTaskAssignment: (_taskId: string, _userId: string) => mockSafeInvoke('check_task_assignment'),
    checkTaskAvailability: (_taskId: string) => mockSafeInvoke('check_task_availability'),
    validateTaskAssignmentChange: (_taskId: string, _oldUserId: string | null, _newUserId: string) => mockSafeInvoke('validate_task_assignment_change'),
    editTask: (taskId: string, updates: JsonObject) =>
      mockSafeInvoke<Task>('edit_task', { request: { task_id: taskId, data: updates } }),
    addTaskNote: (taskId: string, note: string) => mockSafeInvoke('add_task_note', { request: { task_id: taskId, note } }),
    sendTaskMessage: (taskId: string, message: string, messageType: string) => mockSafeInvoke('send_task_message', { request: { task_id: taskId, message, message_type: messageType } }),
    delayTask: (taskId: string, newDate: string, reason: string) => mockSafeInvoke('delay_task', { request: { task_id: taskId, new_scheduled_date: newDate, reason } }),
    reportTaskIssue: (taskId: string, issueType: string, severity: string, description: string) => mockSafeInvoke('report_task_issue', { request: { task_id: taskId, issue_type: issueType, severity, description } }),
    exportTasksCsv: (options: JsonObject) => mockSafeInvoke<string>('export_tasks_csv', { request: options }),
    importTasksBulk: (options: JsonObject) => mockSafeInvoke('import_tasks_bulk', { request: options })
  },
  intervention: {
    getActiveByTask: (taskId: string) =>
      mockSafeInvoke('intervention_get_active_by_task', { task_id: taskId }),
    saveStepProgress: (request: JsonObject, correlationId?: string) =>
      mockSafeInvoke('intervention_save_step_progress', { request, correlation_id: correlationId }),
    getStep: (stepId: string) =>
      mockSafeInvoke('intervention_get_step', { step_id: stepId }),
    getProgress: (interventionId: string) =>
      mockSafeInvoke('intervention_get_progress', { intervention_id: interventionId })
  },
  interventions: {
    start: (data: JsonObject) =>
      mockSafeInvoke('intervention_workflow', { action: { action: 'Start', data } }),
    get: (id: string) =>
      mockSafeInvoke('intervention_workflow', { action: { action: 'Get', id } }),
    getActiveByTask: (taskId: string) =>
      mockSafeInvoke('intervention_workflow', { action: { action: 'GetActiveByTask', task_id: taskId } }),
    getLatestByTask: (taskId: string) =>
      mockSafeInvoke('intervention_get_latest_by_task', { taskId }),
    advanceStep: (stepData: JsonObject) =>
      mockSafeInvoke('intervention_progress', { action: { action: 'AdvanceStep', ...stepData } }),
    getStep: (stepId: string) =>
      mockSafeInvoke('intervention_get_step', { step_id: stepId }),
    getProgress: (interventionId: string) =>
      mockSafeInvoke('intervention_progress', { action: { action: 'Get', intervention_id: interventionId } }),
    saveStepProgress: (stepData: JsonObject) =>
      mockSafeInvoke('intervention_progress', { action: { action: 'SaveStepProgress', ...stepData } }),
    updateWorkflow: (id: string, data: JsonObject) =>
      mockSafeInvoke('intervention_workflow', { action: { action: 'Update', id, data } }),
    finalize: (data: JsonObject) =>
      mockSafeInvoke('intervention_workflow', { action: { action: 'Finalize', data } }),
    list: (filters: JsonObject) =>
      mockSafeInvoke('intervention_management', { request: { action: { List: { filters } } } }),
  },
  notifications: {
    initialize: (config: JsonObject) => mockSafeInvoke('initialize_notification_service', { config }),
    send: (request: JsonObject) => mockSafeInvoke('send_notification', { request }),
    getStatus: () => mockSafeInvoke('get_notification_status', {}),
    getRecentActivities: () => mockSafeInvoke<JsonValue[]>('get_recent_activities', {}),
  },
  settings: {
    getAppSettings: () => mockSafeInvoke('get_app_settings', {}),
    updateNotificationSettings: (request: JsonObject) => mockSafeInvoke('update_notification_settings', { request }),
    getUserSettings: () => mockSafeInvoke<UserSettings>('get_user_settings', {}),
    updateUserProfile: (request: JsonObject) => mockSafeInvoke('update_user_profile', { request }),
    updateUserPreferences: (request: JsonObject) => mockSafeInvoke('update_user_preferences', { request }),
    updateUserSecurity: (request: JsonObject) => mockSafeInvoke('update_user_security', { request }),
    updateUserPerformance: (request: JsonObject) => mockSafeInvoke('update_user_performance', { request }),
    updateUserAccessibility: (request: JsonObject) => mockSafeInvoke('update_user_accessibility', { request }),
    updateUserNotifications: (request: JsonObject) => mockSafeInvoke('update_user_notifications', { request }),
    updateGeneralSettings: (request: JsonObject) => mockSafeInvoke('update_general_settings', { request }),
    updateBusinessRules: (rules: JsonValue[]) => mockSafeInvoke('update_business_rules', { request: { rules } }),
    updateSecurityPolicies: (policies: JsonValue[]) => mockSafeInvoke('update_security_policies', { request: { policies } }),
    updateIntegrations: (integrations: JsonValue[]) => mockSafeInvoke('update_integrations', { request: { integrations } }),
    updatePerformanceConfigs: (configs: JsonValue[]) => mockSafeInvoke('update_performance_configs', { request: { configs } }),
    updateBusinessHours: (hours: JsonObject) => mockSafeInvoke('update_business_hours', { request: { hours } }),
    changeUserPassword: (request: JsonObject) => mockSafeInvoke('change_user_password', { request }),
    getActiveSessions: () => mockSafeInvoke('get_active_sessions', {}),
    revokeSession: (sessionId: string) => mockSafeInvoke('revoke_session', { sessionId }),
    revokeAllSessionsExceptCurrent: () => mockSafeInvoke('revoke_all_sessions_except_current', {}),
    updateSessionTimeout: (timeoutMinutes: number) => mockSafeInvoke('update_session_timeout', { timeoutMinutes }),
    getSessionTimeoutConfig: () => mockSafeInvoke('get_session_timeout_config', {}),
    uploadUserAvatar: (fileData: string, fileName: string, mimeType: string) => mockSafeInvoke('upload_user_avatar', { request: { avatar_data: fileData, mime_type: mimeType } }),
    exportUserData: () => mockSafeInvoke('export_user_data', {}),
    deleteUserAccount: (confirmation: string) => mockSafeInvoke('delete_user_account', { request: { confirmation } }),
    getDataConsent: () => mockSafeInvoke('get_data_consent', {}),
    updateDataConsent: (request: JsonObject) => mockSafeInvoke('update_data_consent', { request }),
  },
  organization: {
    getOnboardingStatus: (): Promise<OnboardingStatus> =>
      mockSafeInvoke<OnboardingStatus>('get_onboarding_status', {}),
    completeOnboarding: (data: OnboardingData): Promise<Organization> =>
      mockSafeInvoke<Organization>('complete_onboarding', { data }),
    get: (_sessionToken: string): Promise<Organization> =>
      mockSafeInvoke<Organization>('get_organization', {}),
    update: (_sessionToken: string, data: UpdateOrganizationRequest): Promise<Organization> =>
      mockSafeInvoke<Organization>('update_organization', { data }),
    uploadLogo: (_sessionToken: string, filePath?: string, base64Data?: string): Promise<Organization> =>
      mockSafeInvoke<Organization>('upload_logo', { file_path: filePath, base64_data: base64Data }),
    getSettings: (_sessionToken: string): Promise<Record<string, string | number | boolean>> =>
      mockSafeInvoke<Record<string, string | number | boolean>>('get_organization_settings', {}),
    updateSettings: (_sessionToken: string, data: UpdateOrganizationSettingsRequest): Promise<Record<string, string | number | boolean>> =>
      mockSafeInvoke<Record<string, string | number | boolean>>('update_organization_settings', { data }),
  },
  security: {
    getActiveSessions: () => mockSafeInvoke('get_active_sessions', {}),
    revokeSession: (sessionId: string) => mockSafeInvoke('revoke_session', { sessionId }),
    revokeAllSessionsExceptCurrent: () => mockSafeInvoke('revoke_all_sessions_except_current', {}),
    updateSessionTimeout: (timeoutMinutes: number) => mockSafeInvoke('update_session_timeout', { timeoutMinutes }),
    getSessionTimeoutConfig: () => mockSafeInvoke('get_session_timeout_config', {}),
  },
  dashboard: {
    getStats: (timeRange?: string) => mockSafeInvoke('dashboard_get_stats', { timeRange }),
  },
  users: {
    create: (data: JsonObject): Promise<JsonValue> =>
      mockSafeInvoke<JsonValue>('user_crud', { request: { action: { action: 'Create', data } } }),
    get: (id: string): Promise<JsonValue> =>
      mockSafeInvoke<JsonValue>('user_crud', { request: { action: { action: 'Get', id } } }),
    list: (limit: number, offset: number): Promise<UserListResponse> =>
      mockSafeInvoke<JsonValue>('user_crud', { request: { action: { action: 'List', limit, offset } } }).then(r => r as UserListResponse),
    update: (id: string, data: JsonObject): Promise<JsonValue> =>
      mockSafeInvoke<JsonValue>('user_crud', { request: { action: { action: 'Update', id, data } } }),
    delete: (id: string): Promise<void> =>
      mockSafeInvoke<void>('user_crud', { request: { action: { action: 'Delete', id } } }),
    changeRole: (id: string, role: string): Promise<void> =>
      mockSafeInvoke<void>('user_crud', { request: { action: { ChangeRole: { id, new_role: role } } } }),
    updateEmail: (id: string, email: string): Promise<JsonValue> =>
      mockSafeInvoke<JsonValue>('user_crud', { request: { action: { action: 'Update', id, data: { email } } } }),
    changePassword: (id: string, password: string): Promise<void> =>
      mockSafeInvoke<void>('user_crud', { request: { action: { ChangePassword: { id, new_password: password } } } }),
    banUser: (id: string): Promise<JsonValue> =>
      mockSafeInvoke<JsonValue>('user_crud', { request: { action: { Ban: { id } } } }),
    unbanUser: (id: string): Promise<JsonValue> =>
      mockSafeInvoke<JsonValue>('user_crud', { request: { action: { Unban: { id } } } }),
  },
  bootstrap: {
    firstAdmin: (userId: string) => mockSafeInvoke('bootstrap_first_admin', { request: { user_id: userId } }),
    hasAdmins: () => mockSafeInvoke<boolean>('has_admins'),
  },
  admin: {
    healthCheck: () => mockSafeInvoke<string>('health_check'),
    getHealthStatus: () => mockSafeInvoke('health_check'),
    getDatabaseStatus: () => mockSafeInvoke('diagnose_database', {}),
    getDatabaseStats: () => mockSafeInvoke('get_database_stats', {}),
    getDatabasePoolHealth: () => mockSafeInvoke('get_database_pool_health', {}),
    getAppInfo: () => mockSafeInvoke('get_app_info'),
    getDeviceInfo: () => mockSafeInvoke('get_device_info'),
  },
  audit: {
    getMetrics: () => mockSafeInvoke('get_security_metrics', {}),
    getEvents: (limit: number) => mockSafeInvoke('get_security_events', { limit }),
    getAlerts: () => mockSafeInvoke('get_security_alerts', {}),
    acknowledgeAlert: (alertId: string) => mockSafeInvoke('acknowledge_security_alert', { alert_id: alertId }),
    resolveAlert: (alertId: string, actionsTaken: string[]) => mockSafeInvoke('resolve_security_alert', { alert_id: alertId, actions_taken: actionsTaken }),
    cleanupEvents: () => mockSafeInvoke('cleanup_security_events', {}),
  },
  calendar: {
    getEvents: (startDate: string, endDate: string, technicianId?: string) => mockSafeInvoke('get_events', { start_date: startDate, end_date: endDate, technician_id: technicianId }),
    getEventById: (id: string) => mockSafeInvoke('get_event_by_id', { request: { id } }),
    createEvent: (eventData: JsonObject) => mockSafeInvoke('create_event', { request: { event_data: eventData } }),
    updateEvent: (id: string, eventData: JsonObject) => mockSafeInvoke('update_event', { request: { id, event_data: eventData } }),
    deleteEvent: (id: string) => mockSafeInvoke('delete_event', { request: { id } }),
    getEventsForTechnician: (technicianId: string) => mockSafeInvoke('get_events_for_technician', { request: { technician_id: technicianId } }),
    getEventsForTask: (taskId: string) => mockSafeInvoke('get_events_for_task', { request: { task_id: taskId } }),
  },
  photos: {
    list: (interventionId: string) => mockSafeInvoke('document_get_photos', { request: { intervention_id: interventionId } }),
    upload: (interventionId: string, file: PhotoUploadFile, photoType: string) => mockSafeInvoke('document_store_photo', { request: { intervention_id: interventionId, file_name: file.name, mime_type: file.mimeType, photo_type: photoType }, image_data: Array.from(file.bytes) as number[] }),
    delete: (photoId: string) => mockSafeInvoke('document_delete_photo', { photo_id: photoId }),
  },
  material: {
    list: (query: JsonObject) => mockSafeInvoke('material_list', query),
    create: (data: JsonObject) => mockSafeInvoke('material_create', { request: data }),
    update: (id: string, data: JsonObject) => mockSafeInvoke('material_update', { id, request: data }),
    get: (id: string) => mockSafeInvoke('material_get', { id }),
    delete: (id: string) => mockSafeInvoke('material_delete', { id }),
    updateStock: (data: JsonObject) => mockSafeInvoke('material_update_stock', { request: data }),
    adjustStock: (data: JsonObject) => mockSafeInvoke('material_adjust_stock', { request: data }),
    recordConsumption: (data: JsonObject) => mockSafeInvoke('material_record_consumption', { request: data }),
    getConsumptionHistory: (materialId: string, query: JsonObject) => mockSafeInvoke('material_get_consumption_history', { material_id: materialId, ...query }),
    createInventoryTransaction: (data: JsonObject) => mockSafeInvoke('material_create_inventory_transaction', { request: data }),
    getTransactionHistory: (materialId: string, query: JsonObject) => mockSafeInvoke('material_get_transaction_history', { material_id: materialId, ...query }),
    createCategory: (data: JsonObject) => mockSafeInvoke('material_create_category', { request: data }),
    listCategories: () => mockSafeInvoke('material_list_categories', {}),
    createSupplier: (data: JsonObject) => mockSafeInvoke('material_create_supplier', { request: data }),
    listSuppliers: () => mockSafeInvoke('material_list_suppliers', {}),
    getStats: () => mockSafeInvoke('material_get_stats', {}),
    getLowStockMaterials: () => mockSafeInvoke('material_get_low_stock_materials', {}),
    getExpiredMaterials: () => mockSafeInvoke('material_get_expired_materials', {}),
    getInventoryMovementSummary: (materialId: string) => mockSafeInvoke('material_get_inventory_movement_summary', { material_id: materialId }),
  }
} as const;

export function useIpcClient() {
  return ipcClient;
}

export { resetDb, installMockControls };
