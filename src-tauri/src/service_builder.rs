//! Service Builder
//!
//! This module provides a centralized location for building and initializing
//! all application services, making dependencies explicit and improving
//! the maintainability of the application startup process.
//!
//! ## Service Dependencies
//!
//! The following services have these dependencies:
//!
//! - **TaskService**: Database
//! - **ClientService**: ClientRepository
//! - **DashboardService**: Database
//! - **InterventionService**: Database
//! - **TaskImportService**: No external dependencies
//! - **AuthService**: Database
//! - **SettingsService**: Database
//! - **PhotoService**: Database, StorageSettings
//! - **MaterialService**: Database
//! - **AnalyticsService**: Database
//! - **SessionService**: Database
//! - **CacheService**: Self-contained (uses internal caching)
//! - **ReportJobService**: Database, CacheService
//! - **PerformanceMonitorService**: Database
//! - **CommandPerformanceTracker**: PerformanceMonitorService
//! - **PredictionService**: Database
//! - **SyncQueue**: Database
//! - **BackgroundSyncService**: SyncQueue
//! - **EventBus**: Self-contained (in-memory pub/sub)
//! - **WebSocketEventHandler**: EventBus

use crate::db::Database;
use crate::domains::audit::infrastructure::audit_log_handler::AuditLogHandler;
use crate::domains::audit::infrastructure::audit_service::AuditService;
use crate::domains::users::infrastructure::user::UserService;
use crate::shared::app_state::AppStateType;
use crate::shared::event_bus::{register_handler, set_global_event_bus};
use crate::shared::repositories::Repositories;
use crate::shared::services::event_bus::InMemoryEventBus;
use crate::shared::services::websocket_event_handler::WebSocketEventHandler;
use std::sync::{Arc, Mutex, OnceLock};

/// Service Builder
///
/// Provides a centralized way to build and initialize all application services
/// with their dependencies explicitly documented.
pub struct ServiceBuilder {
    db: Arc<Database>,
    repositories: Arc<Repositories>,
    app_data_dir: std::path::PathBuf,
}

impl ServiceBuilder {
    /// Create a new ServiceBuilder
    ///
    /// # Arguments
    /// * `db` - Database instance
    /// * `repositories` - Repository instances
    /// * `app_data_dir` - Application data directory path
    pub fn new(
        db: Arc<Database>,
        repositories: Arc<Repositories>,
        app_data_dir: std::path::PathBuf,
    ) -> Self {
        Self {
            db,
            repositories,
            app_data_dir,
        }
    }

    /// Build all services and create AppStateType
    ///
    /// This method initializes all services in the correct order,
    /// respecting their dependencies.
    ///
    /// # Returns
    /// * `Result<AppStateType, Box<dyn std::error::Error>>` - The complete application state
    pub fn build(self) -> Result<AppStateType, Box<dyn std::error::Error>> {
        let db_instance = (*self.db).clone();

        // Initialize core services (no dependencies or only DB)
        let task_service = Arc::new(
            crate::domains::tasks::infrastructure::task::TaskService::new(self.db.clone()),
        );
        let client_service = Arc::new(
            crate::domains::clients::infrastructure::client::ClientService::new(
                self.repositories.client.clone(),
            ),
        );
        let dashboard_repo = Arc::new(crate::domains::analytics::infrastructure::dashboard_repository::DashboardRepository::new(Arc::new(
            db_instance.clone(),
        )));
        let dashboard_service = Arc::new(
            crate::domains::analytics::infrastructure::dashboard::DashboardService::new(
                dashboard_repo,
            ),
        );
        let intervention_service = Arc::new(
            crate::domains::interventions::infrastructure::intervention::InterventionService::new(
                self.db.clone(),
            ),
        );
        let settings_service = Arc::new(
            crate::domains::settings::infrastructure::settings::SettingsService::new(
                self.db.clone(),
            ),
        );
        let task_import_service = Arc::new(
            crate::domains::tasks::infrastructure::task_import::TaskImportService::new(
                self.db.clone(),
            ),
        );

        // Initialize Auth Service (needs initialization)
        let auth_service =
            crate::domains::auth::infrastructure::auth::AuthService::new(db_instance.clone())?;
        auth_service.init()?;
        let auth_service = Arc::new(auth_service);

        // Initialize User Service (depends on user repository)
        let user_service = Arc::new(UserService::new(self.repositories.user.clone()));

        // Initialize Cache Service (self-contained)
        let cache_service = Arc::new(crate::shared::services::cache::CacheService::default()?);

        // Initialize Session Service (depends on DB)
        let session_service = Arc::new(
            crate::domains::auth::infrastructure::session::SessionService::new(self.db.clone()),
        );

        // Initialize Two Factor Service (depends on DB)
        // REMOVED — 2FA has been replaced by plain UUID sessions

        // Initialize Photo Service (depends on DB and StorageSettings).
        // Force local photo storage under the app data directory to avoid writing
        // uploads into the repo root during `tauri dev` (which can trigger backend rebuilds).
        let mut default_storage_settings =
            crate::domains::documents::infrastructure::photo::PhotoStorageSettings::default();
        let photo_storage_path = self.app_data_dir.join("photos");
        default_storage_settings.photo_storage_type = "local".to_string();
        default_storage_settings.local_storage_path =
            Some(photo_storage_path.to_string_lossy().to_string());
        tracing::info!(
            photo_storage_provider = %default_storage_settings.photo_storage_type,
            photo_storage_path = %photo_storage_path.display(),
            "Configured photo storage path"
        );
        let photo_service = Arc::new(
            crate::domains::documents::infrastructure::photo::PhotoService::new(
                db_instance.clone(),
                &default_storage_settings,
            )?,
        );

        // Initialize Material Service (depends on DB)
        let material_service = Arc::new(
            crate::domains::inventory::infrastructure::material::MaterialService::new(
                db_instance.clone(),
            ),
        );

        // Initialize Inventory Service (bounded context facade)
        let inventory_service = Arc::new(crate::domains::inventory::InventoryFacade::new(
            Arc::new(db_instance.clone()),
            material_service.clone(),
        ));

        // Initialize Quote Service (depends on QuoteRepository and DB)
        let quote_service = Arc::new(
            crate::domains::quotes::infrastructure::quote::QuoteService::new(
                self.repositories.quote.clone(),
                self.db.clone(),
            ),
        );

        // Initialize Message Service (depends on MessageRepository and DB)
        let message_service = Arc::new(
            crate::domains::notifications::infrastructure::message::MessageService::new(
                self.repositories.message.clone(),
                self.db.clone(),
            ),
        );

        // Initialize Sync Services
        let sync_queue = Arc::new(crate::domains::sync::infrastructure::sync::SyncQueue::new(
            db_instance.clone(),
        ));
        let background_sync = Arc::new(Mutex::new(
            crate::domains::sync::infrastructure::sync::BackgroundSyncService::new(
                sync_queue.clone(),
            ),
        ));

        // Create async database wrapper
        let async_db = Arc::new(self.db.as_async());

        // Initialize Analytics Service (depends on DB)
        let analytics_service = Arc::new(
            crate::domains::analytics::infrastructure::analytics::AnalyticsService::new(
                db_instance.clone(),
            ),
        );

        // Initialize Performance Monitor Service (depends on DB)
        let performance_monitor_service = Arc::new(
            crate::shared::services::performance_monitor::PerformanceMonitorService::new(
                db_instance.clone(),
            ),
        );

        // Initialize Command Performance Tracker (depends on PerformanceMonitorService)
        let command_performance_tracker = Arc::new(
            crate::shared::services::performance_monitor::CommandPerformanceTracker::new(
                performance_monitor_service.clone(),
            ),
        );

        // Initialize Prediction Service (depends on DB)
        let prediction_service = Arc::new(
            crate::domains::analytics::infrastructure::prediction::PredictionService::new(
                db_instance.clone(),
            ),
        );

        // Initialize Event Bus (self-contained, thread-safe)
        let event_bus = Arc::new(InMemoryEventBus::new());
        set_global_event_bus(event_bus.clone());

        // Register WebSocket Event Handler for real-time updates
        let websocket_handler = WebSocketEventHandler::new();
        event_bus.register_handler(websocket_handler);

        // Register Audit Log Handler for audit trail
        let audit_service = Arc::new(AuditService::new(self.db.clone()));
        if let Err(e) = audit_service.init() {
            tracing::warn!("Audit service init failed (non-fatal): {}", e);
        }
        let audit_log_handler = AuditLogHandler::new(audit_service);
        event_bus.register_handler(audit_log_handler);

        register_handler(inventory_service.intervention_finalized_handler());

        // Note: Additional handlers can be registered here:
        // - SecurityMonitorHandler for security events
        // - NotificationServiceHandler for push notifications
        // - AnalyticsHandler for metrics collection

        // Build and return AppStateType
        Ok(AppStateType {
            db: self.db,
            async_db,
            repositories: self.repositories,
            task_service,
            client_service,
            task_import_service,
            dashboard_service,
            intervention_service,
            material_service,
            inventory_service,
            message_service,
            photo_service,
            quote_service,
            analytics_service,
            auth_service,
            session_service,
            settings_service,
            user_service,
            cache_service,
            report_job_service: OnceLock::new(),
            performance_monitor_service,
            command_performance_tracker,
            prediction_service,
            sync_queue,
            background_sync,
            event_bus,
            app_data_dir: self.app_data_dir,
        })
    }
}

/// Tests for ServiceBuilder
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_service_builder_creation() {
        let db = Arc::new(Database::new_in_memory().await.expect("create db"));
        let repositories = Arc::new(Repositories::new(db.clone(), 1000).await);
        let app_data_dir = std::path::PathBuf::from("/tmp/test");

        let builder = ServiceBuilder::new(db, repositories, app_data_dir);
        assert!(builder.build().is_ok());
    }

    #[tokio::test]
    async fn test_event_bus_initialization() {
        let db = Arc::new(Database::new_in_memory().await.expect("create db"));
        let repositories = Arc::new(Repositories::new(db.clone(), 1000).await);
        let app_data_dir = std::path::PathBuf::from("/tmp/test");

        let builder = ServiceBuilder::new(db, repositories, app_data_dir);
        let app_state = builder.build().expect("Failed to build app state");

        // Verify event bus is initialized
        assert!(app_state.event_bus.has_handlers("TaskCreated"));
        assert!(app_state.event_bus.has_handlers("TaskUpdated"));
        assert!(app_state.event_bus.has_handlers("InterventionStarted"));
        assert!(app_state.event_bus.has_handlers("AuthenticationSuccess"));
    }

    #[tokio::test]
    async fn test_websocket_handler_registration() {
        let db = Arc::new(Database::new_in_memory().await.expect("create db"));
        let repositories = Arc::new(Repositories::new(db.clone(), 1000).await);
        let app_data_dir = std::path::PathBuf::from("/tmp/test");

        let builder = ServiceBuilder::new(db, repositories, app_data_dir);
        let app_state = builder.build().expect("Failed to build app state");

        // Verify WebSocket handler is registered for all event types it handles
        let handler_count = app_state.event_bus.handler_count("TaskCreated");
        assert!(
            handler_count > 0,
            "WebSocket handler should be registered for TaskCreated"
        );
    }
}
