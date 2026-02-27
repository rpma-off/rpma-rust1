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
  /** @deprecated NOT_IMPLEMENTED — no backend handler; refresh flow uses session re-validation */
  AUTH_REFRESH_TOKEN: 'auth_refresh_token',
  AUTH_LOGOUT: 'auth_logout',
  AUTH_VALIDATE_SESSION: 'auth_validate_session',
  /** @deprecated NOT_IMPLEMENTED — 2FA backend not yet available */
  ENABLE_2FA: 'enable_2fa',
  /** @deprecated NOT_IMPLEMENTED — 2FA backend not yet available */
  VERIFY_2FA_SETUP: 'verify_2fa_setup',
  /** @deprecated NOT_IMPLEMENTED — 2FA backend not yet available */
  DISABLE_2FA: 'disable_2fa',
  /** @deprecated NOT_IMPLEMENTED — 2FA backend not yet available */
  REGENERATE_BACKUP_CODES: 'regenerate_backup_codes',
  /** @deprecated NOT_IMPLEMENTED — 2FA backend not yet available */
  IS_2FA_ENABLED: 'is_2fa_enabled',

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

  // Report commands
  GET_TASK_COMPLETION_REPORT: 'get_task_completion_report',
  GET_TECHNICIAN_PERFORMANCE_REPORT: 'get_technician_performance_report',
  GET_CLIENT_ANALYTICS_REPORT: 'get_client_analytics_report',
  GET_QUALITY_COMPLIANCE_REPORT: 'get_quality_compliance_report',
  GET_MATERIAL_USAGE_REPORT: 'get_material_usage_report',
  GET_GEOGRAPHIC_REPORT: 'get_geographic_report',
  GET_OVERVIEW_REPORT: 'get_overview_report',
  EXPORT_REPORT_DATA: 'export_report_data',
  EXPORT_INTERVENTION_REPORT: 'export_intervention_report',
  SAVE_INTERVENTION_REPORT: 'save_intervention_report',
  GET_REPORT_STATUS: 'get_report_status',
  CANCEL_REPORT: 'cancel_report',
  GET_AVAILABLE_REPORT_TYPES: 'get_available_report_types',
  SEARCH_RECORDS: 'search_records',
  SEARCH_TASKS: 'search_tasks',
  SEARCH_CLIENTS: 'search_clients',
  SEARCH_INTERVENTIONS: 'search_interventions',
  GET_ENTITY_COUNTS: 'get_entity_counts',
  GET_SEASONAL_REPORT: 'get_seasonal_report',
  GET_OPERATIONAL_INTELLIGENCE_REPORT: 'get_operational_intelligence_report',
  GENERATE_INTERVENTION_PDF_REPORT: 'generate_intervention_pdf_report',
  TEST_PDF_GENERATION: 'test_pdf_generation',
  SUBMIT_REPORT_JOB: 'submit_report_job',
  SUBMIT_TASK_COMPLETION_REPORT_JOB: 'submit_task_completion_report_job',
  GET_REPORT_JOB_RESULT: 'get_report_job_result',

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
  TEST_NOTIFICATION_CONFIG: 'test_notification_config',
  GET_NOTIFICATION_STATUS: 'get_notification_status',
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

  // Analytics commands
  ANALYTICS_GET_SUMMARY: 'analytics_get_summary',

  // Dashboard commands
  DASHBOARD_GET_STATS: 'dashboard_get_stats',

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

  // Sync commands
  SYNC_START_BACKGROUND_SERVICE: 'sync_start_background_service',
  SYNC_STOP_BACKGROUND_SERVICE: 'sync_stop_background_service',
  SYNC_GET_STATUS: 'sync_get_status',
  SYNC_NOW: 'sync_now',
  SYNC_GET_OPERATIONS_FOR_ENTITY: 'sync_get_operations_for_entity',
  SYNC_ENQUEUE: 'sync_enqueue',
  SYNC_DEQUEUE_BATCH: 'sync_dequeue_batch',
  SYNC_GET_METRICS: 'sync_get_metrics',
  SYNC_MARK_COMPLETED: 'sync_mark_completed',
  SYNC_MARK_FAILED: 'sync_mark_failed',
  SYNC_GET_OPERATION: 'sync_get_operation',
  SYNC_CLEANUP_OLD_OPERATIONS: 'sync_cleanup_old_operations',

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
  QUOTE_EXPORT_PDF: 'quote_export_pdf',

  // WebSocket commands
  INIT_WEBSOCKET_SERVER: 'init_websocket_server',
  BROADCAST_WEBSOCKET_MESSAGE: 'broadcast_websocket_message',
  SEND_WEBSOCKET_MESSAGE_TO_CLIENT: 'send_websocket_message_to_client',
  GET_WEBSOCKET_STATS: 'get_websocket_stats',
  SHUTDOWN_WEBSOCKET_SERVER: 'shutdown_websocket_server',
  BROADCAST_TASK_UPDATE: 'broadcast_task_update',
  BROADCAST_INTERVENTION_UPDATE: 'broadcast_intervention_update',
  BROADCAST_CLIENT_UPDATE: 'broadcast_client_update',
  BROADCAST_SYSTEM_NOTIFICATION: 'broadcast_system_notification',

  // IPC optimization commands
  COMPRESS_DATA_FOR_IPC: 'compress_data_for_ipc',
  DECOMPRESS_DATA_FROM_IPC: 'decompress_data_from_ipc',
  START_STREAM_TRANSFER: 'start_stream_transfer',
  SEND_STREAM_CHUNK: 'send_stream_chunk',
  GET_STREAM_DATA: 'get_stream_data',
  GET_IPC_STATS: 'get_ipc_stats',
} as const;
