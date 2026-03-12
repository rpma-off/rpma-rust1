/**
 * Centralized registry of all IPC command strings.
 * This eliminates hardcoded strings throughout the codebase.
 *
 * Entries marked "NOT_IMPLEMENTED" have no backend handler registered in
 * main.rs — invoking them will return a Tauri "command not found" error.
 * They are kept here so TypeScript consumers compile, but the feature is
 * not yet available.
 */
export const IPC_COMMANDS = {
  // Auth commands
  AUTH_LOGIN: 'auth_login',
  AUTH_CREATE_ACCOUNT: 'auth_create_account',
  AUTH_LOGOUT: 'auth_logout',
  AUTH_VALIDATE_SESSION: 'auth_validate_session',

  // Task commands
  TASK_CRUD: 'task_crud',
  CHECK_TASK_ASSIGNMENT: 'check_task_assignment',
  CHECK_TASK_AVAILABILITY: 'check_task_availability',
  GET_TASK_HISTORY: 'get_task_history',
  VALIDATE_TASK_ASSIGNMENT_CHANGE: 'validate_task_assignment_change',
  EDIT_TASK: 'edit_task',
  ADD_TASK_NOTE: 'add_task_note',
  SEND_TASK_MESSAGE: 'send_task_message',
  DELAY_TASK: 'delay_task',
  REPORT_TASK_ISSUE: 'report_task_issue',
  EXPORT_TASKS_CSV: 'export_tasks_csv',
  IMPORT_TASKS_BULK: 'import_tasks_bulk',
  TASK_TRANSITION_STATUS: 'task_transition_status',
  TASK_GET_STATUS_DISTRIBUTION: 'task_get_status_distribution',

  // Client commands
  CLIENT_CRUD: 'client_crud',

  // Inventory/Material commands
  MATERIAL_LIST: 'material_list',
  MATERIAL_CREATE: 'material_create',
  MATERIAL_UPDATE: 'material_update',
  MATERIAL_GET: 'material_get',
  MATERIAL_GET_BY_SKU: 'material_get_by_sku',
  MATERIAL_DELETE: 'material_delete',
  MATERIAL_UPDATE_STOCK: 'material_update_stock',
  MATERIAL_ADJUST_STOCK: 'material_adjust_stock',
  MATERIAL_RECORD_CONSUMPTION: 'material_record_consumption',
  MATERIAL_GET_CONSUMPTION_HISTORY: 'material_get_consumption_history',
  MATERIAL_GET_INTERVENTION_CONSUMPTION: 'material_get_intervention_consumption',
  MATERIAL_GET_INTERVENTION_SUMMARY: 'material_get_intervention_summary',
  MATERIAL_CREATE_INVENTORY_TRANSACTION: 'material_create_inventory_transaction',
  MATERIAL_GET_TRANSACTION_HISTORY: 'material_get_transaction_history',
  MATERIAL_CREATE_CATEGORY: 'material_create_category',
  MATERIAL_LIST_CATEGORIES: 'material_list_categories',
  MATERIAL_CREATE_SUPPLIER: 'material_create_supplier',
  MATERIAL_LIST_SUPPLIERS: 'material_list_suppliers',
  MATERIAL_GET_STATS: 'material_get_stats',
  INVENTORY_GET_STATS: 'inventory_get_stats',
  MATERIAL_GET_LOW_STOCK: 'material_get_low_stock',
  MATERIAL_GET_LOW_STOCK_MATERIALS: 'material_get_low_stock_materials',
  MATERIAL_GET_EXPIRED: 'material_get_expired',
  MATERIAL_GET_EXPIRED_MATERIALS: 'material_get_expired_materials',
  MATERIAL_GET_INVENTORY_MOVEMENT_SUMMARY: 'material_get_inventory_movement_summary',
  // S-1 perf: batch endpoint — replaces 4 individual IPC calls on dashboard mount.
  INVENTORY_GET_DASHBOARD_DATA: 'inventory_get_dashboard_data',

  // Document report commands
  EXPORT_INTERVENTION_REPORT: 'export_intervention_report',
  SAVE_INTERVENTION_REPORT: 'save_intervention_report',

  // Document / Photo commands (backed by the documents bounded context)
  DOCUMENT_STORE_PHOTO: 'document_store_photo',
  DOCUMENT_GET_PHOTOS: 'document_get_photos',
  DOCUMENT_GET_PHOTO: 'document_get_photo',
  DOCUMENT_DELETE_PHOTO: 'document_delete_photo',
  DOCUMENT_GET_PHOTO_DATA: 'document_get_photo_data',
  DOCUMENT_UPDATE_PHOTO_METADATA: 'document_update_photo_metadata',

  // Intervention commands (composite)
  INTERVENTION_WORKFLOW: 'intervention_workflow',
  INTERVENTION_PROGRESS: 'intervention_progress',
  INTERVENTION_MANAGEMENT: 'intervention_management',
  INTERVENTION_GET_ACTIVE_BY_TASK: 'intervention_get_active_by_task',
  INTERVENTION_GET_LATEST_BY_TASK: 'intervention_get_latest_by_task',
  INTERVENTION_SAVE_STEP_PROGRESS: 'intervention_save_step_progress',
  INTERVENTION_GET_STEP: 'intervention_get_step',
  INTERVENTION_GET_PROGRESS: 'intervention_get_progress',
  // Intervention commands (individual)
  INTERVENTION_START: 'intervention_start',
  INTERVENTION_GET: 'intervention_get',
  INTERVENTION_UPDATE: 'intervention_update',
  INTERVENTION_DELETE: 'intervention_delete',
  INTERVENTION_FINALIZE: 'intervention_finalize',
  INTERVENTION_ADVANCE_STEP: 'intervention_advance_step',

  // Notification commands
  INITIALIZE_NOTIFICATION_SERVICE: 'initialize_notification_service',
  SEND_NOTIFICATION: 'send_notification',
  GET_NOTIFICATION_STATUS: 'get_notification_status',
  GET_NOTIFICATIONS: 'get_notifications',
  MARK_NOTIFICATION_READ: 'mark_notification_read',
  MARK_ALL_NOTIFICATIONS_READ: 'mark_all_notifications_read',
  DELETE_NOTIFICATION: 'delete_notification',
  CREATE_NOTIFICATION: 'create_notification',
  GET_RECENT_ACTIVITIES: 'get_recent_activities',

  // Message commands
  MESSAGE_SEND: 'message_send',
  MESSAGE_GET_LIST: 'message_get_list',
  MESSAGE_MARK_READ: 'message_mark_read',
  MESSAGE_GET_TEMPLATES: 'message_get_templates',
  MESSAGE_GET_PREFERENCES: 'message_get_preferences',
  MESSAGE_UPDATE_PREFERENCES: 'message_update_preferences',

  // Settings commands
  GET_APP_SETTINGS: 'get_app_settings',
  UPDATE_GENERAL_SETTINGS: 'update_general_settings',
  UPDATE_SECURITY_SETTINGS: 'update_security_settings',
  UPDATE_NOTIFICATION_SETTINGS: 'update_notification_settings',
  UPDATE_BUSINESS_RULES: 'update_business_rules',
  UPDATE_SECURITY_POLICIES: 'update_security_policies',
  UPDATE_INTEGRATIONS: 'update_integrations',
  UPDATE_PERFORMANCE_CONFIGS: 'update_performance_configs',
  UPDATE_BUSINESS_HOURS: 'update_business_hours',
  GET_USER_SETTINGS: 'get_user_settings',
  UPDATE_USER_PROFILE: 'update_user_profile',
  UPDATE_USER_PREFERENCES: 'update_user_preferences',
  UPDATE_USER_SECURITY: 'update_user_security',
  UPDATE_USER_PERFORMANCE: 'update_user_performance',
  UPDATE_USER_ACCESSIBILITY: 'update_user_accessibility',
  UPDATE_USER_NOTIFICATIONS: 'update_user_notifications',
  GET_ACTIVE_SESSIONS: 'get_active_sessions',
  REVOKE_SESSION: 'revoke_session',
  REVOKE_ALL_SESSIONS_EXCEPT_CURRENT: 'revoke_all_sessions_except_current',
  UPDATE_SESSION_TIMEOUT: 'update_session_timeout',
  GET_SESSION_TIMEOUT_CONFIG: 'get_session_timeout_config',
  UPLOAD_USER_AVATAR: 'upload_user_avatar',
  EXPORT_USER_DATA: 'export_user_data',
  DELETE_USER_ACCOUNT: 'delete_user_account',
  GET_DATA_CONSENT: 'get_data_consent',
  UPDATE_DATA_CONSENT: 'update_data_consent',

  // Dashboard commands
  DASHBOARD_GET_STATS: 'dashboard_get_stats',
  GET_ENTITY_COUNTS: 'get_entity_counts',
  REPORTS_GET_CAPABILITIES: 'reports_get_capabilities',
  REPORT_GENERATE: 'report_generate',
  REPORT_GET: 'report_get',
  REPORT_GET_BY_INTERVENTION: 'report_get_by_intervention',
  REPORT_LIST: 'report_list',

  // User commands
  USER_CRUD: 'user_crud',
  GET_USERS: 'get_users',
  CREATE_USER: 'create_user',
  UPDATE_USER: 'update_user',
  UPDATE_USER_STATUS: 'update_user_status',
  DELETE_USER: 'delete_user',
  CHANGE_USER_PASSWORD: 'change_user_password',

  // Bootstrap commands
  BOOTSTRAP_FIRST_ADMIN: 'bootstrap_first_admin',
  HAS_ADMINS: 'has_admins',

  // Security commands
  GET_SECURITY_METRICS: 'get_security_metrics',
  GET_SECURITY_EVENTS: 'get_security_events',
  GET_SECURITY_ALERTS: 'get_security_alerts',
  ACKNOWLEDGE_SECURITY_ALERT: 'acknowledge_security_alert',
  RESOLVE_SECURITY_ALERT: 'resolve_security_alert',
  CLEANUP_SECURITY_EVENTS: 'cleanup_security_events',

  // System commands
  HEALTH_CHECK: 'health_check',
  DIAGNOSE_DATABASE: 'diagnose_database',
  GET_DATABASE_STATS: 'get_database_stats',
  GET_DATABASE_STATUS: 'get_database_status',
  GET_DATABASE_POOL_HEALTH: 'get_database_pool_health',
  GET_DATABASE_POOL_STATS: 'get_database_pool_stats',
  GET_APP_INFO: 'get_app_info',
  GET_DEVICE_INFO: 'get_device_info',
  VACUUM_DATABASE: 'vacuum_database',
  GET_LARGE_TEST_DATA: 'get_large_test_data',

  // UI commands
  UI_WINDOW_MINIMIZE: 'ui_window_minimize',
  UI_WINDOW_MAXIMIZE: 'ui_window_maximize',
  UI_WINDOW_CLOSE: 'ui_window_close',
  UI_WINDOW_GET_STATE: 'ui_window_get_state',
  UI_WINDOW_SET_ALWAYS_ON_TOP: 'ui_window_set_always_on_top',
  NAVIGATION_UPDATE: 'navigation_update',
  NAVIGATION_GO_BACK: 'navigation_go_back',
  NAVIGATION_GO_FORWARD: 'navigation_go_forward',
  NAVIGATION_GET_CURRENT: 'navigation_get_current',
  NAVIGATION_ADD_TO_HISTORY: 'navigation_add_to_history',
  NAVIGATION_REFRESH: 'navigation_refresh',
  SHORTCUTS_REGISTER: 'shortcuts_register',
  UI_SHELL_OPEN_URL: 'ui_shell_open_url',
  UI_GPS_GET_CURRENT_POSITION: 'ui_gps_get_current_position',
  UI_INITIATE_CUSTOMER_CALL: 'ui_initiate_customer_call',

  // Log commands
  SEND_LOG_TO_FRONTEND: 'send_log_to_frontend',
  LOG_TASK_CREATION_DEBUG: 'log_task_creation_debug',
  LOG_CLIENT_CREATION_DEBUG: 'log_client_creation_debug',

  // Calendar commands
  GET_EVENTS: 'get_events',
  GET_EVENT_BY_ID: 'get_event_by_id',
  CREATE_EVENT: 'create_event',
  UPDATE_EVENT: 'update_event',
  DELETE_EVENT: 'delete_event',
  GET_EVENTS_FOR_TECHNICIAN: 'get_events_for_technician',
  GET_EVENTS_FOR_TASK: 'get_events_for_task',
  CALENDAR_GET_TASKS: 'calendar_get_tasks',
  CALENDAR_CHECK_CONFLICTS: 'calendar_check_conflicts',
  CALENDAR_SCHEDULE_TASK: 'calendar_schedule_task',

  // Quote commands
  QUOTE_CREATE: 'quote_create',
  QUOTE_GET: 'quote_get',
  QUOTE_LIST: 'quote_list',
  QUOTE_UPDATE: 'quote_update',
  QUOTE_DELETE: 'quote_delete',
  QUOTE_ITEM_ADD: 'quote_item_add',
  QUOTE_ITEM_UPDATE: 'quote_item_update',
  QUOTE_ITEM_DELETE: 'quote_item_delete',
  QUOTE_MARK_SENT: 'quote_mark_sent',
  QUOTE_MARK_ACCEPTED: 'quote_mark_accepted',
  QUOTE_MARK_REJECTED: 'quote_mark_rejected',
  QUOTE_MARK_EXPIRED: 'quote_mark_expired',
  QUOTE_MARK_CHANGES_REQUESTED: 'quote_mark_changes_requested',
  QUOTE_REOPEN: 'quote_reopen',
  QUOTE_DUPLICATE: 'quote_duplicate',
  QUOTE_EXPORT_PDF: 'quote_export_pdf',
  QUOTE_ATTACHMENTS_GET: 'quote_attachments_get',
  QUOTE_ATTACHMENT_CREATE: 'quote_attachment_create',
  QUOTE_ATTACHMENT_UPDATE: 'quote_attachment_update',
  QUOTE_ATTACHMENT_DELETE: 'quote_attachment_delete',
  QUOTE_ATTACHMENT_OPEN: 'quote_attachment_open',
  QUOTE_CONVERT_TO_TASK: 'quote_convert_to_task',

  // Organization commands
  GET_ONBOARDING_STATUS: 'get_onboarding_status',
  COMPLETE_ONBOARDING: 'complete_onboarding',
  GET_ORGANIZATION: 'get_organization',
  UPDATE_ORGANIZATION: 'update_organization',
  UPLOAD_LOGO: 'upload_logo',
  GET_ORGANIZATION_SETTINGS: 'get_organization_settings',
  UPDATE_ORGANIZATION_SETTINGS: 'update_organization_settings',

  // IPC optimization commands
  COMPRESS_DATA_FOR_IPC: 'compress_data_for_ipc',
  DECOMPRESS_DATA_FROM_IPC: 'decompress_data_from_ipc',
  START_STREAM_TRANSFER: 'start_stream_transfer',
  SEND_STREAM_CHUNK: 'send_stream_chunk',
  GET_STREAM_DATA: 'get_stream_data',
  GET_IPC_STATS: 'get_ipc_stats',
} as const;
