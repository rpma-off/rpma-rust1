// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod logging;
mod memory_management;
mod memory_management_helpers;

mod models;
mod repositories;
mod service_builder;
mod services;
mod sync;

use commands::navigation;

use std::sync::Arc;
use std::time::Duration;
use tauri::async_runtime;
use tauri::Manager;
use tauri_plugin_dialog;
use tokio::time;
use tracing::{debug, error, info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

// Import logging modules
// use crate::logging::{RPMARequestLogger, LogDomain};
// use crate::logging::correlation::{extract_correlation_id, extract_user_id, generate_correlation_id};

fn init_tracing() {
    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| {
        if cfg!(debug_assertions) {
            EnvFilter::new("debug")
        } else {
            EnvFilter::new("info")
        }
    });

    tracing_subscriber::registry()
        .with(env_filter)
        .with(
            tracing_subscriber::fmt::layer()
                .with_target(true)
                .with_thread_ids(true)
                .with_file(true)
                .with_line_number(true)
                .with_ansi(true),
        )
        .init();

    info!("RPMA v2 logging system initialized");
}

fn main() {
    dotenvy::dotenv().ok();
    init_tracing();

    info!("Starting RPMA v2 PPF Intervention application");
    info!(
        "Build info: {} v{}",
        env!("CARGO_PKG_NAME"),
        env!("CARGO_PKG_VERSION")
    );

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::system::health_check,
            commands::system::diagnose_database,
            commands::system::get_database_stats,
            commands::get_database_pool_health,
            commands::get_large_test_data,
            commands::vacuum_database,
            commands::system::get_app_info,
            commands::system::get_device_info,
            commands::task::task_crud,
            commands::task::edit_task,
            // commands::task::add_task_note, // TODO: implement
            // commands::task::send_task_message, // TODO: implement
            commands::task::delay_task,
            // commands::task::report_task_issue, // TODO: implement
            commands::task::export_tasks_csv,
            commands::task::import_tasks_bulk,
            commands::client::client_crud,
            commands::user::user_crud,
            commands::user::bootstrap_first_admin,
            commands::user::has_admins,
            commands::get_users,
            commands::create_user,
            commands::update_user,
            commands::update_user_status,
            commands::delete_user,
            commands::intervention::intervention_workflow,
            commands::intervention::intervention_progress,
            commands::intervention::intervention_management,
            // New individual intervention commands
            commands::intervention::intervention_start,
            commands::intervention::intervention_get,
            commands::intervention::intervention_get_active_by_task,
            commands::intervention::intervention_get_latest_by_task,
            commands::intervention::intervention_update,
            commands::intervention::intervention_delete,
            commands::intervention::intervention_finalize,
            commands::intervention::intervention_advance_step,
            commands::intervention::intervention_save_step_progress,
            commands::intervention::intervention_get_progress,
            commands::intervention::intervention_get_step,
            // commands::photo::photo_crud, // TODO: implement photo module
            // commands::photo::store_photo_with_data, // TODO: implement photo module
            // commands::photo::get_photo_data, // TODO: implement photo module
            commands::material::material_create,
            commands::material::material_get,
            commands::material::material_get_by_sku,
            commands::material::material_list,
            commands::material::material_update,
            commands::material::material_update_stock,
            commands::material::material_record_consumption,
            commands::material::material_get_intervention_consumption,
            commands::material::material_get_intervention_summary,
            commands::material::material_get_stats,
            commands::material::material_get_low_stock,
            commands::material::material_get_expired,
            commands::security::get_security_metrics,
            commands::security::get_security_events,
            commands::security::get_security_alerts,
            commands::security::acknowledge_security_alert,
            commands::security::resolve_security_alert,
            commands::security::cleanup_security_events,
            commands::security::get_active_sessions,
            commands::security::revoke_session,
            commands::security::revoke_all_sessions_except_current,
            commands::security::update_session_timeout,
            commands::security::get_session_timeout_config,
            commands::queue::sync_enqueue,
            commands::queue::sync_dequeue_batch,
            commands::queue::sync_get_metrics,
            commands::queue::sync_mark_completed,
            commands::queue::sync_mark_failed,
            commands::queue::sync_get_operation,
            commands::queue::sync_cleanup_old_operations,
            commands::sync::sync_start_background_service,
            commands::sync::sync_stop_background_service,
            commands::sync::sync_now,
            commands::sync::sync_get_status,
            commands::sync::sync_get_operations_for_entity,
            commands::ui::ui_window_minimize,
            commands::ui::ui_window_maximize,
            commands::ui::ui_window_close,
            commands::ui::ui_shell_open_url,
            commands::ui::ui_initiate_customer_call,
            commands::ui::get_recent_activities,
            commands::ui::ui_gps_get_current_position,
            commands::ui::ui_window_get_state,
            commands::ui::ui_window_set_always_on_top,
            commands::auth::auth_login,
            commands::auth::auth_create_account,
            commands::auth::auth_logout,
            commands::auth::auth_validate_session,
            commands::auth::auth_refresh_token,
            commands::auth::enable_2fa,
            commands::auth::verify_2fa_setup,
            commands::auth::disable_2fa,
            commands::auth::verify_2fa_code,
            commands::auth::is_2fa_enabled,
            commands::ui::dashboard_get_stats,
            // commands::settings::get_app_settings, // TODO: check export
            commands::settings::update_general_settings,
            commands::settings::update_security_settings,
            commands::settings::update_notification_settings,
            commands::settings::get_user_settings,
            commands::settings::update_user_profile,
            commands::settings::update_user_preferences,
            commands::settings::update_user_security,
            commands::settings::update_user_performance,
            commands::settings::update_user_accessibility,
            commands::settings::update_user_notifications,
            commands::settings::change_user_password,
            commands::settings::export_user_data,
            commands::settings::delete_user_account,
            commands::settings::get_data_consent,
            commands::settings::update_data_consent,
            commands::settings::upload_user_avatar,
            commands::notification::initialize_notification_service,
            commands::notification::send_notification,
            commands::notification::test_notification_config,
            commands::notification::get_notification_status,
            commands::performance::get_performance_stats,
            commands::performance::get_performance_metrics,
            commands::performance::cleanup_performance_metrics,
            commands::performance::get_cache_statistics,
            commands::performance::clear_application_cache,
            commands::performance::configure_cache_settings,
            // commands::settings::update_appearance_settings,
            // commands::settings::update_data_management_settings,
            // commands::settings::get_system_configuration,
            // commands::settings::update_database_settings,
            // commands::settings::update_integration_settings,
            // commands::settings::update_performance_settings,
            // commands::settings::update_backup_settings,
            // commands::settings::update_diagnostic_settings,
            // commands::settings::test_database_connection,
            // commands::settings::perform_database_backup,
            // commands::settings::run_system_diagnostics,
            // commands::system::diagnose_database,
            // commands::system::force_wal_checkpoint,
            // commands::settings::update_performance_settings,
            navigation::navigation_update,
            navigation::navigation_add_to_history,
            navigation::navigation_go_back,
            navigation::navigation_go_forward,
            navigation::navigation_get_current,
            navigation::navigation_refresh,
            navigation::shortcuts_register,
            commands::log::send_log_to_frontend,
            commands::log::log_task_creation_debug,
            commands::log::log_client_creation_debug,
            // Reports commands
            // commands::reports::test_reports_command, // TODO: implement
            commands::reports::get_task_completion_report,
            commands::reports::get_technician_performance_report,
            commands::reports::get_client_analytics_report,
            commands::reports::get_quality_compliance_report,
            commands::reports::get_material_usage_report,
            commands::reports::get_geographic_report,
            commands::reports::get_overview_report,
            commands::reports::search_records,
            // commands::reports::get_entity_counts, // TODO: check export
            // commands::reports::export_report_data, // TODO: check export
            // commands::reports::export_intervention_report, // TODO: check export
            // commands::reports::save_intervention_report, // TODO: check export
            commands::reports::get_available_report_types,
            // commands::reports::get_report_status, // TODO: Fix export conflict between core and generation modules
            // commands::reports::cancel_report, // TODO: Fix export conflict
            commands::reports::get_seasonal_report,
            commands::reports::get_operational_intelligence_report,
            commands::task::check_task_assignment,
            commands::task::check_task_availability,
            // commands::task::validate_task_assignment_change, // TODO: fix registration
            commands::calendar::get_events,
            commands::calendar::get_event_by_id,
            commands::calendar::create_event,
            commands::calendar::update_event,
            commands::calendar::delete_event,
            commands::calendar::get_events_for_technician,
            commands::calendar::get_events_for_task,
            commands::calendar::calendar_get_tasks,
            commands::calendar::calendar_check_conflicts,
            // Status transition commands
            commands::status::task_transition_status,
            commands::status::task_get_status_distribution,
            // Message commands
            commands::message::message_send,
            commands::message::message_get_list,
            commands::message::message_mark_read,
            commands::message::message_get_templates,
            commands::message::message_get_preferences,
            commands::message::message_update_preferences,
            // IPC optimization commands
            commands::ipc_optimization::compress_data_for_ipc,
            commands::ipc_optimization::decompress_data_from_ipc,
            commands::ipc_optimization::start_stream_transfer,
            commands::ipc_optimization::send_stream_chunk,
            commands::ipc_optimization::get_stream_data,
            commands::ipc_optimization::get_ipc_stats,
            // WebSocket commands
            commands::websocket_commands::init_websocket_server,
            commands::websocket_commands::broadcast_websocket_message,
            commands::websocket_commands::send_websocket_message_to_client,
            commands::websocket_commands::get_websocket_stats,
            commands::websocket_commands::shutdown_websocket_server,
            commands::websocket_commands::broadcast_task_update,
            commands::websocket_commands::broadcast_intervention_update,
            commands::websocket_commands::broadcast_client_update,
            commands::websocket_commands::broadcast_system_notification
        ])
        .setup(|app| {
            info!("Initializing application setup");

            // Get app data directory
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            debug!("App data directory: {:?}", app_dir);

            // Create directory if not exists
            std::fs::create_dir_all(&app_dir).expect("Failed to create app data directory");
            debug!("Created app data directory");

            // Database path
            let db_path = app_dir.join("rpma.db");
            info!("Database path: {:?}", db_path);

            // Check if database file already exists
            let db_exists = db_path.exists();
            let db_size = if db_exists {
                match std::fs::metadata(&db_path) {
                    Ok(metadata) => metadata.len(),
                    Err(e) => {
                        warn!("Failed to get database file metadata: {}", e);
                        0
                    }
                }
            } else {
                0
            };
            info!(
                "Database file exists: {}, size: {} bytes",
                db_exists, db_size
            );

            // Initialize database
            let encryption_key = std::env::var("RPMA_DB_KEY").unwrap_or_else(|_| "".to_string());
            let db_instance = db::Database::new(&db_path, &encryption_key)
                .expect("Failed to create database connection");
            let db = std::sync::Arc::new(db_instance.clone());
            info!("Database connection established");

            // Since we're in a non-async context, we need to use tokio::block_on
            let repositories = tokio::runtime::Runtime::new().unwrap().block_on(async {
                crate::repositories::Repositories::new(Arc::new(db_instance.clone()), 1000).await
            });
            let repositories = Arc::new(repositories);

            // Test database health check
            match db_instance.health_check() {
                Ok(_) => info!("Database health check passed"),
                Err(e) => {
                    error!("Database health check failed: {}", e);
                    return Err(e.into());
                }
            }

            match db_instance.is_initialized() {
                Ok(true) => {
                    info!("Database already initialized, checking for migrations");
                    // For existing databases, check current version and migrate if needed
                    let current_version = db_instance.get_version()?;
                    let latest_version = db::Database::get_latest_migration_version();
                    info!("Current version: {}, Target version: {}", current_version, latest_version);
                    if current_version < latest_version {
                        if let Err(e) = db_instance.migrate(latest_version) {
                            error!("Failed to apply migrations: {}", e);
                            return Err(e.into());
                        }
                        info!("Database migrations applied successfully");
                    } else {
                        info!("Database is already at latest version {}", current_version);
                    }
                }
                Ok(false) => {
                    info!("Initializing database schema from schema.sql (version 25)");
                    if let Err(e) = db_instance.init() {
                        error!("Failed to initialize database schema: {}", e);
                        return Err(e.into());
                    }
                    // schema.sql initializes schema_version to 25, so no migrations needed
                    info!("Database schema initialized at version 25");
                }
                Err(e) => {
                    error!("Failed to check database initialization status: {}", e);
                    return Err(e.into());
                }
            }

            // Run initial WAL checkpoint
            if let Ok(conn) = db_instance.get_connection() {
                info!("Running initial WAL checkpoint...");
                if let Err(e) = conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);") {
                    error!("Failed to checkpoint WAL: {}", e);
                }
            }

            // Spawn periodic WAL checkpoint task
            let db_for_checkpoint = db.clone();
            async_runtime::spawn(async move {
                let mut interval = time::interval(Duration::from_secs(60));
                loop {
                    interval.tick().await;
                    let _ = db::checkpoint_wal(db_for_checkpoint.pool());
                }
            });

            // Initialize services using ServiceBuilder
            info!("Initializing application services using ServiceBuilder");
            let service_builder = service_builder::ServiceBuilder::new(
                db.clone(),
                repositories.clone(),
                app_dir.clone(),
            );
            let app_state = service_builder.build().expect("Failed to build services");
            info!("All services initialized successfully");

            // Store in app state
            app.manage(app_state);

            info!("Application setup completed successfully");
            Ok(())
        })
        .run(tauri::generate_context!())
        .map_err(|e| error!("Failed to run Tauri application: {}", e))
        .expect("error while running tauri application");
}
