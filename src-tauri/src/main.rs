// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod domains;
mod logging;
mod memory_management;
mod memory_management_helpers;

mod service_builder;
mod shared;
#[cfg(test)]
mod test_utils;

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
            commands::get_database_status,
            commands::get_database_pool_stats,
            commands::get_large_test_data,
            commands::vacuum_database,
            commands::system::get_app_info,
            commands::system::get_device_info,
            domains::tasks::ipc::task::task_crud,
            domains::tasks::ipc::task::edit_task,
            domains::tasks::ipc::task::add_task_note,
            domains::tasks::ipc::task::send_task_message,
            domains::tasks::ipc::task::delay_task,
            domains::tasks::ipc::task::report_task_issue,
            domains::tasks::ipc::task::export_tasks_csv,
            domains::tasks::ipc::task::import_tasks_bulk,
            domains::clients::ipc::client::client_crud,
            domains::users::ipc::user::user_crud,
            domains::users::ipc::user::bootstrap_first_admin,
            domains::users::ipc::user::has_admins,
            domains::users::ipc::user::get_users,
            domains::users::ipc::user::create_user,
            domains::users::ipc::user::update_user,
            domains::users::ipc::user::update_user_status,
            domains::users::ipc::user::delete_user,
            domains::interventions::ipc::intervention::intervention_workflow,
            domains::interventions::ipc::intervention::intervention_progress,
            domains::interventions::ipc::intervention::intervention_management,
            // New individual intervention commands
            domains::interventions::ipc::intervention::intervention_start,
            domains::interventions::ipc::intervention::intervention_get,
            domains::interventions::ipc::intervention::intervention_get_active_by_task,
            domains::interventions::ipc::intervention::intervention_get_latest_by_task,
            domains::interventions::ipc::intervention::intervention_update,
            domains::interventions::ipc::intervention::intervention_delete,
            domains::interventions::ipc::intervention::intervention_finalize,
            domains::interventions::ipc::intervention::intervention_advance_step,
            domains::interventions::ipc::intervention::intervention_save_step_progress,
            domains::interventions::ipc::intervention::intervention_get_progress,
            domains::interventions::ipc::intervention::intervention_get_step,
            // commands::photo::photo_crud, // TODO: implement photo module
            // commands::photo::store_photo_with_data, // TODO: implement photo module
            // commands::photo::get_photo_data, // TODO: implement photo module
            domains::inventory::ipc::material::material_create,
            domains::inventory::ipc::material::material_get,
            domains::inventory::ipc::material::material_get_by_sku,
            domains::inventory::ipc::material::material_list,
            domains::inventory::ipc::material::material_update,
            domains::inventory::ipc::material::material_delete,
            domains::inventory::ipc::material::material_update_stock,
            domains::inventory::ipc::material::material_adjust_stock,
            domains::inventory::ipc::material::material_record_consumption,
            domains::inventory::ipc::material::material_get_consumption_history,
            domains::inventory::ipc::material::material_get_intervention_consumption,
            domains::inventory::ipc::material::material_get_intervention_summary,
            domains::inventory::ipc::material::material_create_inventory_transaction,
            domains::inventory::ipc::material::material_get_transaction_history,
            domains::inventory::ipc::material::material_create_category,
            domains::inventory::ipc::material::material_list_categories,
            domains::inventory::ipc::material::material_create_supplier,
            domains::inventory::ipc::material::material_list_suppliers,
            domains::inventory::ipc::material::material_get_stats,
            domains::inventory::ipc::material::material_get_low_stock,
            domains::inventory::ipc::material::material_get_expired,
            domains::inventory::ipc::material::material_get_low_stock_materials,
            domains::inventory::ipc::material::material_get_expired_materials,
            domains::inventory::ipc::material::material_get_inventory_movement_summary,
            domains::inventory::ipc::material::inventory_get_stats,
            domains::audit::ipc::security::get_security_metrics,
            domains::audit::ipc::security::get_security_events,
            domains::audit::ipc::security::get_security_alerts,
            domains::audit::ipc::security::acknowledge_security_alert,
            domains::audit::ipc::security::resolve_security_alert,
            domains::audit::ipc::security::cleanup_security_events,
            domains::audit::ipc::security::get_active_sessions,
            domains::audit::ipc::security::revoke_session,
            domains::audit::ipc::security::revoke_all_sessions_except_current,
            domains::audit::ipc::security::update_session_timeout,
            domains::audit::ipc::security::get_session_timeout_config,
            domains::sync::ipc::queue::sync_enqueue,
            domains::sync::ipc::queue::sync_dequeue_batch,
            domains::sync::ipc::queue::sync_get_metrics,
            domains::sync::ipc::queue::sync_mark_completed,
            domains::sync::ipc::queue::sync_mark_failed,
            domains::sync::ipc::queue::sync_get_operation,
            domains::sync::ipc::queue::sync_cleanup_old_operations,
            domains::sync::ipc::sync::sync_start_background_service,
            domains::sync::ipc::sync::sync_stop_background_service,
            domains::sync::ipc::sync::sync_now,
            domains::sync::ipc::sync::sync_get_status,
            domains::sync::ipc::sync::sync_get_operations_for_entity,
            // Documents commands
            domains::documents::ipc::document::document_store_photo,
            domains::documents::ipc::document::document_get_photos,
            domains::documents::ipc::document::document_get_photo,
            domains::documents::ipc::document::document_delete_photo,
            domains::documents::ipc::document::document_get_photo_data,
            domains::documents::ipc::document::document_update_photo_metadata,
            commands::ui::ui_window_minimize,
            commands::ui::ui_window_maximize,
            commands::ui::ui_window_close,
            commands::ui::ui_shell_open_url,
            commands::ui::ui_initiate_customer_call,
            commands::ui::get_recent_activities,
            commands::ui::ui_gps_get_current_position,
            commands::ui::ui_window_get_state,
            commands::ui::ui_window_set_always_on_top,
            domains::auth::ipc::auth::auth_login,
            domains::auth::ipc::auth::auth_create_account,
            domains::auth::ipc::auth::auth_logout,
            domains::auth::ipc::auth::auth_validate_session,
            domains::analytics::ipc::analytics::analytics_get_summary,
            commands::ui::dashboard_get_stats,
            domains::settings::ipc::settings::core::get_app_settings,
            domains::settings::ipc::settings::update_general_settings,
            domains::settings::ipc::settings::update_security_settings,
            domains::settings::ipc::settings::update_notification_settings,
            domains::settings::ipc::settings::get_user_settings,
            domains::settings::ipc::settings::update_user_profile,
            domains::settings::ipc::settings::update_user_preferences,
            domains::settings::ipc::settings::update_user_security,
            domains::settings::ipc::settings::update_user_performance,
            domains::settings::ipc::settings::update_user_accessibility,
            domains::settings::ipc::settings::update_user_notifications,
            domains::settings::ipc::settings::change_user_password,
            domains::settings::ipc::settings::export_user_data,
            domains::settings::ipc::settings::delete_user_account,
            domains::settings::ipc::settings::get_data_consent,
            domains::settings::ipc::settings::update_data_consent,
            domains::settings::ipc::settings::upload_user_avatar,
            domains::notifications::ipc::notification::initialize_notification_service,
            domains::notifications::ipc::notification::send_notification,
            domains::notifications::ipc::notification::test_notification_config,
            domains::notifications::ipc::notification::get_notification_status,
            domains::notifications::ipc::notification_in_app::get_notifications,
            domains::notifications::ipc::notification_in_app::mark_notification_read,
            domains::notifications::ipc::notification_in_app::mark_all_notifications_read,
            domains::notifications::ipc::notification_in_app::delete_notification,
            domains::notifications::ipc::notification_in_app::create_notification,
            commands::performance::get_performance_stats,
            commands::performance::get_performance_metrics,
            commands::performance::cleanup_performance_metrics,
            commands::performance::get_cache_statistics,
            commands::performance::clear_application_cache,
            commands::performance::configure_cache_settings,
            // domains::settings::ipc::settings::update_appearance_settings,
            // domains::settings::ipc::settings::update_data_management_settings,
            // domains::settings::ipc::settings::get_system_configuration,
            // domains::settings::ipc::settings::update_database_settings,
            // domains::settings::ipc::settings::update_integration_settings,
            // domains::settings::ipc::settings::update_performance_settings,
            // domains::settings::ipc::settings::update_backup_settings,
            // domains::settings::ipc::settings::update_diagnostic_settings,
            // domains::settings::ipc::settings::test_database_connection,
            // domains::settings::ipc::settings::perform_database_backup,
            // domains::settings::ipc::settings::run_system_diagnostics,
            // commands::system::diagnose_database,
            // commands::system::force_wal_checkpoint,
            // domains::settings::ipc::settings::update_performance_settings,
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
            // domains::reports::ipc::reports::test_reports_command, // TODO: implement
            domains::reports::ipc::reports::get_task_completion_report,
            domains::reports::ipc::reports::get_technician_performance_report,
            domains::reports::ipc::reports::get_client_analytics_report,
            domains::reports::ipc::reports::get_quality_compliance_report,
            domains::reports::ipc::reports::get_material_usage_report,
            domains::reports::ipc::reports::get_geographic_report,
            domains::reports::ipc::reports::get_overview_report,
            domains::reports::ipc::reports::search_records,
            domains::reports::ipc::reports::search_tasks,
            domains::reports::ipc::reports::search_clients,
            domains::reports::ipc::reports::search_interventions,
            domains::reports::ipc::reports::get_entity_counts,
            domains::reports::ipc::reports::export_report_data,
            domains::reports::ipc::reports::export_intervention_report,
            domains::reports::ipc::reports::save_intervention_report,
            domains::reports::ipc::reports::get_available_report_types,
            domains::reports::ipc::reports::get_report_status,
            domains::reports::ipc::reports::cancel_report,
            domains::reports::ipc::reports::generation::background_jobs::submit_report_job,
            domains::reports::ipc::reports::generation::background_jobs::submit_task_completion_report_job,
            domains::reports::ipc::reports::generation::background_jobs::get_report_job_result,
            domains::reports::ipc::reports::generation::pdf_generation::generate_intervention_pdf_report,
            domains::reports::ipc::reports::generation::pdf_generation::test_pdf_generation,
            domains::reports::ipc::reports::get_seasonal_report,
            domains::reports::ipc::reports::get_operational_intelligence_report,
            domains::tasks::ipc::task::check_task_assignment,
            domains::tasks::ipc::task::check_task_availability,
            domains::tasks::ipc::task::get_task_history,
            domains::tasks::ipc::task::validate_task_assignment_change,
            domains::calendar::ipc::calendar::get_events,
            domains::calendar::ipc::calendar::get_event_by_id,
            domains::calendar::ipc::calendar::create_event,
            domains::calendar::ipc::calendar::update_event,
            domains::calendar::ipc::calendar::delete_event,
            domains::calendar::ipc::calendar::get_events_for_technician,
            domains::calendar::ipc::calendar::get_events_for_task,
            domains::calendar::ipc::calendar::calendar_get_tasks,
            domains::calendar::ipc::calendar::calendar_check_conflicts,
            domains::calendar::ipc::calendar::calendar_schedule_task,
            // Status transition commands
            domains::tasks::ipc::status::task_transition_status,
            domains::tasks::ipc::status::task_get_status_distribution,
            // Message commands
            domains::notifications::ipc::message::message_send,
            domains::notifications::ipc::message::message_get_list,
            domains::notifications::ipc::message::message_mark_read,
            domains::notifications::ipc::message::message_get_templates,
            domains::notifications::ipc::message::message_get_preferences,
            domains::notifications::ipc::message::message_update_preferences,
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
            commands::websocket_commands::broadcast_system_notification,
            // Quote commands
            domains::quotes::ipc::quote::quote_create,
            domains::quotes::ipc::quote::quote_get,
            domains::quotes::ipc::quote::quote_list,
            domains::quotes::ipc::quote::quote_update,
            domains::quotes::ipc::quote::quote_delete,
            domains::quotes::ipc::quote::quote_item_add,
            domains::quotes::ipc::quote::quote_item_update,
            domains::quotes::ipc::quote::quote_item_delete,
            domains::quotes::ipc::quote::quote_mark_sent,
            domains::quotes::ipc::quote::quote_mark_accepted,
            domains::quotes::ipc::quote::quote_mark_rejected,
            domains::quotes::ipc::quote::quote_export_pdf
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
                crate::shared::repositories::Repositories::new(Arc::new(db_instance.clone()), 1000)
                    .await
            });
            let repositories = Arc::new(repositories);

            match db_instance.is_initialized() {
                Ok(true) => {
                    info!("Database already initialized, checking for migrations");
                    // For existing databases, check current version and migrate if needed
                    let current_version = db_instance.get_version()?;
                    let latest_version = db::Database::get_latest_migration_version();
                    info!(
                        "Current version: {}, Target version: {}",
                        current_version, latest_version
                    );
                    if current_version < latest_version {
                        if let Err(e) = db_instance.migrate(latest_version) {
                            error!("Failed to apply migrations: {}", e);
                            return Err(e.into());
                        }
                        info!("Database migrations applied successfully");
                    } else {
                        info!("Database is already at latest version {}", current_version);
                    }

                    if let Err(e) = db_instance.ensure_required_views() {
                        error!("Failed to ensure required views: {}", e);
                        return Err(e.into());
                    }
                }
                Ok(false) => {
                    info!("Initializing database schema from schema.sql");
                    if let Err(e) = db_instance.init() {
                        error!("Failed to initialize database schema: {}", e);
                        return Err(e.into());
                    }
                    info!("Database schema initialized");

                    let latest_version = db::Database::get_latest_migration_version();
                    let current_version = db_instance.get_version()?;
                    if current_version < latest_version {
                        if let Err(e) = db_instance.migrate(latest_version) {
                            error!("Failed to apply post-init migrations: {}", e);
                            return Err(e.into());
                        }
                        info!(
                            "Post-init migrations applied successfully ({} -> {})",
                            current_version, latest_version
                        );
                    }

                    if let Err(e) = db_instance.ensure_required_views() {
                        error!("Failed to ensure required views: {}", e);
                        return Err(e.into());
                    }
                }
                Err(e) => {
                    error!("Failed to check database initialization status: {}", e);
                    return Err(e.into());
                }
            }

            // Verify database health after initialization/migrations
            match db_instance.health_check() {
                Ok(_) => info!("Database health check passed"),
                Err(e) => {
                    error!("Database health check failed: {}", e);
                    return Err(e.into());
                }
            }

            if let Ok(conn) = db_instance.get_connection() {
                match conn.query_row("PRAGMA quick_check(1);", [], |row| row.get::<_, String>(0)) {
                    Ok(result) if result == "ok" => info!("Database quick_check passed"),
                    Ok(result) => {
                        error!("Database quick_check failed: {}", result);
                        return Err("Database quick_check failed".into());
                    }
                    Err(e) => {
                        error!("Failed to run database quick_check: {}", e);
                        return Err(e.into());
                    }
                }
            }

            // Run initial WAL checkpoint
            if let Ok(conn) = db_instance.get_connection() {
                info!("Running initial WAL checkpoint...");
                if let Err(e) =
                    conn.execute_batch("PRAGMA wal_checkpoint(PASSIVE); PRAGMA optimize;")
                {
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
