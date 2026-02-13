/**
 * Centralized registry of all IPC command strings
 * This eliminates hardcoded strings throughout the codebase
 */
export const IPC_COMMANDS = {
  // Auth commands
  AUTH_LOGIN: 'auth_login',
  AUTH_CREATE_ACCOUNT: 'auth_create_account',
  AUTH_REFRESH_TOKEN: 'auth_refresh_token',
  AUTH_LOGOUT: 'auth_logout',
  AUTH_VALIDATE_SESSION: 'auth_validate_session',
  ENABLE_2FA: 'enable_2fa',
  VERIFY_2FA_SETUP: 'verify_2fa_setup',
  DISABLE_2FA: 'disable_2fa',
  REGENERATE_BACKUP_CODES: 'regenerate_backup_codes',
  IS_2FA_ENABLED: 'is_2fa_enabled',

  // Task commands
  TASK_CRUD: 'task_crud',
  CHECK_TASK_ASSIGNMENT: 'check_task_assignment',
  CHECK_TASK_AVAILABILITY: 'check_task_availability',
  VALIDATE_TASK_ASSIGNMENT_CHANGE: 'validate_task_assignment_change',
  EDIT_TASK: 'edit_task',
  ADD_TASK_NOTE: 'add_task_note',
  SEND_TASK_MESSAGE: 'send_task_message',
  DELAY_TASK: 'delay_task',
  REPORT_TASK_ISSUE: 'report_task_issue',
  EXPORT_TASKS_CSV: 'export_tasks_csv',
  IMPORT_TASKS_BULK: 'import_tasks_bulk',

  // Client commands
  CLIENT_CRUD: 'client_crud',

  // Inventory/Material commands
  MATERIAL_LIST: 'material_list',
  MATERIAL_CREATE: 'material_create',
  MATERIAL_UPDATE: 'material_update',
  MATERIAL_GET: 'material_get',
  MATERIAL_DELETE: 'material_delete',
  MATERIAL_UPDATE_STOCK: 'material_update_stock',
  MATERIAL_ADJUST_STOCK: 'material_adjust_stock',
  MATERIAL_RECORD_CONSUMPTION: 'material_record_consumption',
  MATERIAL_GET_CONSUMPTION_HISTORY: 'material_get_consumption_history',
  MATERIAL_CREATE_INVENTORY_TRANSACTION: 'material_create_inventory_transaction',
  MATERIAL_GET_TRANSACTION_HISTORY: 'material_get_transaction_history',
  MATERIAL_CREATE_CATEGORY: 'material_create_category',
  MATERIAL_LIST_CATEGORIES: 'material_list_categories',
  MATERIAL_CREATE_SUPPLIER: 'material_create_supplier',
  MATERIAL_LIST_SUPPLIERS: 'material_list_suppliers',
  MATERIAL_GET_STATS: 'material_get_stats',
  MATERIAL_GET_LOW_STOCK_MATERIALS: 'material_get_low_stock_materials',
  MATERIAL_GET_EXPIRED_MATERIALS: 'material_get_expired_materials',
  MATERIAL_GET_INVENTORY_MOVEMENT_SUMMARY: 'material_get_inventory_movement_summary',

  // Report commands
  GET_TASK_COMPLETION_REPORT: 'get_task_completion_report',
  GET_TECHNICIAN_PERFORMANCE_REPORT: 'get_technician_performance_report',
  GET_CLIENT_ANALYTICS_REPORT: 'get_client_analytics_report',
  GET_QUALITY_COMPLIANCE_REPORT: 'get_quality_compliance_report',
  GET_MATERIAL_USAGE_REPORT: 'get_material_usage_report',
  GET_OVERVIEW_REPORT: 'get_overview_report',
  EXPORT_REPORT_DATA: 'export_report_data',
  EXPORT_INTERVENTION_REPORT: 'export_intervention_report',
  SAVE_INTERVENTION_REPORT: 'save_intervention_report',
  GET_REPORT_STATUS: 'get_report_status',
  CANCEL_REPORT: 'cancel_report',
  GET_AVAILABLE_REPORT_TYPES: 'get_available_report_types',
  SEARCH_RECORDS: 'search_records',

  // Photo commands
  PHOTO_CRUD: 'photo_crud',

  // Intervention commands
  INTERVENTION_WORKFLOW: 'intervention_workflow',
  INTERVENTION_PROGRESS: 'intervention_progress',
  INTERVENTION_MANAGEMENT: 'intervention_management',
  INTERVENTION_GET_ACTIVE_BY_TASK: 'intervention_get_active_by_task',
  INTERVENTION_GET_LATEST_BY_TASK: 'intervention_get_latest_by_task',
  INTERVENTION_SAVE_STEP_PROGRESS: 'intervention_save_step_progress',
  INTERVENTION_GET_STEP: 'intervention_get_step',
  INTERVENTION_GET_PROGRESS: 'intervention_get_progress',

  // Notification commands
  INITIALIZE_NOTIFICATION_SERVICE: 'initialize_notification_service',
  SEND_NOTIFICATION: 'send_notification',
  TEST_NOTIFICATION_CONFIG: 'test_notification_config',
  GET_NOTIFICATION_STATUS: 'get_notification_status',
  GET_RECENT_ACTIVITIES: 'get_recent_activities',

  // Settings commands
  GET_APP_SETTINGS: 'get_app_settings',
  UPDATE_NOTIFICATION_SETTINGS: 'update_notification_settings',
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

  // User commands
  USER_CRUD: 'user_crud',
  CHANGE_USER_ROLE: 'change_user_role',
  UPDATE_USER_EMAIL: 'update_user_email',
  CHANGE_USER_PASSWORD: 'change_user_password',
  BAN_USER: 'ban_user',
  UNBAN_USER: 'unban_user',

  // Bootstrap commands
  BOOTSTRAP_FIRST_ADMIN: 'bootstrap_first_admin',
  HAS_ADMINS: 'has_admins',

  // Sync commands
  SYNC_START_BACKGROUND_SERVICE: 'sync_start_background_service',
  SYNC_STOP_BACKGROUND_SERVICE: 'sync_stop_background_service',
  SYNC_GET_STATUS: 'sync_get_status',
  SYNC_NOW: 'sync_now',
  SYNC_GET_OPERATIONS_FOR_ENTITY: 'sync_get_operations_for_entity',

  // Performance commands
  GET_PERFORMANCE_STATS: 'get_performance_stats',
  GET_PERFORMANCE_METRICS: 'get_performance_metrics',
  CLEANUP_PERFORMANCE_METRICS: 'cleanup_performance_metrics',
  GET_CACHE_STATISTICS: 'get_cache_statistics',
  CLEAR_APPLICATION_CACHE: 'clear_application_cache',
  CONFIGURE_CACHE_SETTINGS: 'configure_cache_settings',

  // Security commands
  GET_SECURITY_METRICS: 'get_security_metrics',
  GET_SECURITY_EVENTS: 'get_security_events',
  GET_SECURITY_ALERTS: 'get_security_alerts',
  ACKNOWLEDGE_SECURITY_ALERT: 'acknowledge_security_alert',
  RESOLVE_SECURITY_ALERT: 'resolve_security_alert',
  CLEANUP_SECURITY_EVENTS: 'cleanup_security_events',
  BLOCK_IP_ADDRESS: 'block_ip_address',
  UNBLOCK_IP_ADDRESS: 'unblock_ip_address',
  GET_BLOCKED_IPS: 'get_blocked_ips',

  // System commands
  HEALTH_CHECK: 'health_check',
  GET_HEALTH_STATUS: 'get_health_status',
  GET_APPLICATION_METRICS: 'get_application_metrics',
  DIAGNOSE_DATABASE: 'diagnose_database',
  GET_DATABASE_STATS: 'get_database_stats',
  GET_DATABASE_POOL_HEALTH: 'get_database_pool_health',
  GET_APP_INFO: 'get_app_info',
  GET_DEVICE_INFO: 'get_device_info',

  // UI commands
  UI_WINDOW_MINIMIZE: 'ui_window_minimize',
  UI_WINDOW_MAXIMIZE: 'ui_window_maximize',
  UI_WINDOW_CLOSE: 'ui_window_close',
  NAVIGATION_UPDATE: 'navigation_update',
  NAVIGATION_GO_BACK: 'navigation_go_back',
  NAVIGATION_GO_FORWARD: 'navigation_go_forward',
  NAVIGATION_GET_CURRENT: 'navigation_get_current',
  NAVIGATION_ADD_TO_HISTORY: 'navigation_add_to_history',
  SHORTCUTS_REGISTER: 'shortcuts_register',
  UI_SHELL_OPEN_URL: 'ui_shell_open_url',
  UI_GPS_GET_CURRENT_POSITION: 'ui_gps_get_current_position',
  UI_INITIATE_CUSTOMER_CALL: 'ui_initiate_customer_call',

  // Calendar commands
  GET_EVENTS: 'get_events',
  GET_EVENT_BY_ID: 'get_event_by_id',
  CREATE_EVENT: 'create_event',
  UPDATE_EVENT: 'update_event',
  DELETE_EVENT: 'delete_event',
  GET_EVENTS_FOR_TECHNICIAN: 'get_events_for_technician',
  GET_EVENTS_FOR_TASK: 'get_events_for_task',
  CALENDAR_SCHEDULE_TASK: 'calendar_schedule_task',
} as const;
