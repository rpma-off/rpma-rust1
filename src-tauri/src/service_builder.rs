//! Service Builder
//!
//! This module provides a centralized location for building and initializing
//! all application services, making dependencies explicit and improving
//! the maintainability of the application startup process.
//!
//! ADR-021 dependency graph / initialization order
//!
//! ADR-021 (`docs/adr/021-centralized-service-orchestration.md`) designates
//! `ServiceBuilder` as the authoritative factory for startup orchestration and
//! requires services to be initialized in dependency order.
//!
//! ```text
//! Roots
//!   Database
//!   Repositories.{client,user,quote,message}
//!   AppDataDir
//!
//! 1. TaskService                     <- Database
//! 2. QuoteEventBus                   <- self-contained
//! 3. EventBus                        <- self-contained
//! 4. ClientService                   <- Repositories.client + EventBus
//! 5. InterventionService             <- Database
//! 6. InterventionWorkflowService     <- Database
//! 7. SettingsService                 <- Database
//! 8. TaskImportService               <- Database
//! 9. AuthService                     <- Database (plus init)
//! 10. UserService                    <- Repositories.user
//! 11. CacheService                   <- self-contained
//! 12. SessionService                 <- Database
//! 13. SessionStore                   <- self-contained
//! 14. PhotoService                   <- Database + AppDataDir-derived storage settings
//! 15. MaterialService                <- Database
//! 16. InventoryFacade                <- Database + MaterialService
//! 17. QuoteService                   <- Repositories.quote + Database + QuoteEventBus
//! 18. MessageService                 <- Repositories.message + Database
//! 19. AsyncDatabase                  <- Database
//! 20. AuditService                   <- Database (plus init)
//! 21. AuditLogHandler                <- AuditService + EventBus registration
//! 22. InterventionFinalizedHandler   <- InventoryFacade + global EventBus registration
//! 23. QuoteAcceptedHandler           <- InterventionWorkflowService + global EventBus registration
// TODO(scaffold): ("TrashService", &["Database"]),   // ← wire real deps
//! 24. QuoteConvertedHandler          <- InterventionWorkflowService + global EventBus registration
//!
//! The graph is intentionally acyclic: every edge points from a root resource or an
//! earlier-initialized service to a later-initialized one. If a future change needs a
//! back-reference, extract the shared logic into a smaller service or inject it lazily
//! instead of introducing a constructor-time cycle.
//! ```

use crate::db::Database;
use crate::domains::users::infrastructure::user::UserService;
use crate::infrastructure::auth::session_store::SessionStore;
use crate::shared::app_state::AppStateType;
use crate::shared::event_bus::{register_handler, set_global_event_bus};
use crate::shared::logging::audit_log_handler::AuditLogHandler;
use crate::shared::logging::audit_service::AuditService;
use crate::shared::repositories::Repositories;
use crate::shared::services::event_bus::InMemoryEventBus;
#[cfg(test)]
use std::collections::{HashMap, HashSet};
use std::sync::Arc;

#[cfg(test)]
const DOCUMENTED_SERVICE_INIT_ORDER: &[&str] = &[
    "TaskService",
    "QuoteEventBus",
    "EventBus",
    "ClientService",
    "InterventionService",
    "InterventionWorkflowService",
    "SettingsService",
    "TaskImportService",
    "AuthService",
    "UserService",
    "CacheService",
    "SessionService",
    "SessionStore",
    "PhotoService",
    "MaterialService",
    "InventoryFacade",
    "QuoteService",
    "MessageService",
    "AsyncDatabase",
    "AuditService",
    "AuditLogHandler",
    "InterventionFinalizedHandler",
    "QuoteAcceptedHandler",
    "QuoteConvertedHandler",
];

#[cfg(test)]
const DOCUMENTED_SERVICE_DEPENDENCIES: &[(&str, &[&str])] = &[
    ("TaskService", &["Database"]),
    ("QuoteEventBus", &[]),
    ("EventBus", &[]),
    ("ClientService", &["Repositories.client", "EventBus"]),
    ("InterventionService", &["Database"]),
    ("InterventionWorkflowService", &["Database"]),
    ("SettingsService", &["Database"]),
    ("TaskImportService", &["Database"]),
    ("AuthService", &["Database"]),
    ("UserService", &["Repositories.user"]),
    ("CacheService", &[]),
    ("SessionService", &["Database"]),
    ("SessionStore", &[]),
    ("PhotoService", &["Database", "AppDataDir"]),
    ("MaterialService", &["Database"]),
    ("InventoryFacade", &["Database", "MaterialService"]),
    (
        "QuoteService",
        &["Repositories.quote", "Database", "QuoteEventBus"],
    ),
    ("MessageService", &["Repositories.message", "Database"]),
    ("AsyncDatabase", &["Database"]),
    ("AuditService", &["Database"]),
    ("AuditLogHandler", &["AuditService", "EventBus"]),
    (
        "InterventionFinalizedHandler",
        &["InventoryFacade", "EventBus"],
    ),
    (
        "QuoteAcceptedHandler",
        &["InterventionWorkflowService", "EventBus"],
    ),
    (
        "QuoteConvertedHandler",
        &["InterventionWorkflowService", "EventBus"],
    ),
];

/// Service Builder
///
/// Provides a centralized way to build and initialize all application services
/// with their dependencies explicitly documented.
pub struct ServiceBuilder {
    db: Arc<Database>,
    repositories: Arc<Repositories>,
    app_data_dir: std::path::PathBuf,
    /// Only present in non-test builds — avoids linking Tauri's native WebView DLL
    /// into test binaries, which causes STATUS_ENTRYPOINT_NOT_FOUND on Windows.
    #[cfg(not(test))]
    app_handle: Option<tauri::AppHandle>,
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
            #[cfg(not(test))]
            app_handle: None,
        }
    }

    /// Attach a Tauri AppHandle so the event bus can push events to the frontend.
    ///
    /// When provided, a [`TauriEmitter`] subscriber is registered on the event bus
    /// at build time, forwarding key domain events as Tauri events to all windows.
    #[cfg(not(test))]
    pub fn with_app_handle(mut self, app_handle: tauri::AppHandle) -> Self {
        self.app_handle = Some(app_handle);
        self
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

        // Quote service currently depends on the event_bus implementation.
        let quote_event_bus = Arc::new(crate::shared::services::event_bus::InMemoryEventBus::new());

        // Initialize Event Bus early (self-contained, thread-safe) so it can be
        // injected into services that publish domain events at startup.
        let event_bus = Arc::new(InMemoryEventBus::new());
        set_global_event_bus(event_bus.clone());

        let client_service = Arc::new(
            crate::domains::clients::application::client_service::ClientService::new(
                self.repositories.client.clone(),
                event_bus.clone(),
            ),
        );
        let intervention_service = Arc::new(
            crate::domains::interventions::infrastructure::intervention::InterventionService::new(
                self.db.clone(),
            ),
        );
        let intervention_workflow_service = Arc::new(
            crate::domains::interventions::infrastructure::intervention_workflow::InterventionWorkflowService::new(
                self.db.clone(),
            ),
        );
        let settings_repository = Arc::new(crate::domains::settings::SettingsRepository::new(
            self.db.clone(),
        ));
        let user_settings_repository = Arc::new(
            crate::domains::settings::UserSettingsRepository::new(self.db.clone()),
        );
        let task_import_service = Arc::new(
            crate::domains::tasks::infrastructure::task_import::TaskImportService::new(
                self.db.clone(),
            ),
        );
        let calendar_service = Arc::new(
            crate::domains::calendar::calendar_handler::CalendarService::new(self.db.clone()),
        );

        // Initialize Auth Service (needs initialization)
        let auth_service =
            crate::domains::auth::infrastructure::auth::AuthService::new(db_instance.clone())?;
        auth_service.init()?;
        let auth_service = Arc::new(auth_service);

        // Initialize User Service (depends on user repository)
        let user_service = Arc::new(UserService::new(self.repositories.user.clone()));

        // Initialize Cache Service (self-contained)
        let cache_service = Arc::new(crate::shared::services::cache::CacheService::default());

        // Initialize Session Service (depends on DB)
        let session_service = Arc::new(
            crate::domains::auth::infrastructure::session::SessionService::new(self.db.clone()),
        );

        let session_store = Arc::new(SessionStore::default());

        // Initialize Two Factor Service (depends on DB)
        // REMOVED — 2FA has been replaced by plain UUID sessions

        // Initialize Photo Service (depends on DB and StorageSettings).
        // Force local photo storage under the app data directory to avoid writing
        // uploads into the repo root during `tauri dev` (which can trigger backend rebuilds).
        let mut default_storage_settings =
            crate::domains::documents::PhotoStorageSettings::default();
        let photo_storage_path = self.app_data_dir.join("photos");
        default_storage_settings.photo_storage_type = "local".to_string();
        default_storage_settings.local_storage_path =
            Some(photo_storage_path.to_string_lossy().to_string());
        tracing::info!(
            photo_storage_provider = %default_storage_settings.photo_storage_type,
            photo_storage_path = %photo_storage_path.display(),
            "Configured photo storage path"
        );
        let photo_service = Arc::new(crate::domains::documents::PhotoService::new(
            db_instance.clone(),
            &default_storage_settings,
        )?);

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

        // Initialize Quote Service (depends on QuoteRepository)
        let quote_service = Arc::new(
            crate::domains::quotes::infrastructure::quote::QuoteService::new(
                self.repositories.quote.clone()
                    as Arc<dyn crate::domains::quotes::domain::models::quote::IQuoteRepository>,
                quote_event_bus,
            ),
        );

        // Initialize Message Service (depends on MessageRepository)
        let message_service = Arc::new(crate::domains::notifications::MessageService::new(
            self.repositories.message.clone(),
            self.db.clone(),
            self.repositories.cache.clone(),
        ));

        // Create async database wrapper
        let async_db = Arc::new(self.db.as_async());

        // Register Audit Log Handler for audit trail
        let audit_service = Arc::new(AuditService::new(self.db.clone()));
        if let Err(e) = audit_service.init() {
            tracing::warn!("Audit service init failed (non-fatal): {}", e);
        }
        let audit_log_handler = AuditLogHandler::new(audit_service);
        event_bus.register_handler(audit_log_handler);

        register_handler(inventory_service.intervention_finalized_handler());

        // Register Quote Event Handlers
        let quote_accepted_handler = crate::domains::interventions::application::quote_event_handlers::QuoteAcceptedHandler::new(
            intervention_workflow_service.clone() as Arc<dyn crate::domains::interventions::application::InterventionCreator>,
        );
        register_handler(Arc::new(quote_accepted_handler));

        let quote_converted_handler = crate::domains::interventions::application::quote_event_handlers::QuoteConvertedHandler::new(
            intervention_workflow_service.clone() as Arc<dyn crate::domains::interventions::application::InterventionCreator>,
        );
        register_handler(Arc::new(quote_converted_handler));

        // Register Tauri event emitter when an AppHandle is available (production only).
        // Excluded from test builds to avoid linking WebView2 native DLLs.
        #[cfg(not(test))]
        if let Some(app_handle) = self.app_handle {
            let tauri_emitter = crate::shared::services::event_bus::TauriEmitter::new(app_handle);
            event_bus.register_handler(tauri_emitter);
        }

        // Note: Additional handlers can be registered here:
        // - SecurityMonitorHandler for security events
        // - NotificationServiceHandler for push notifications
        // - AnalyticsHandler for metrics collection

        let trash_service = Arc::new(
            crate::domains::trash::application::services::trash_service::TrashService::new(
                self.db.clone(),
            ),
        );

        // Build and return AppStateType
        Ok(AppStateType {
            db: self.db,
            async_db,
            repositories: self.repositories,
            task_service,
            client_service,
            task_import_service,
            calendar_service,
            intervention_service,
            material_service,
            inventory_service,
            message_service,
            photo_service,
            quote_service,
            auth_service,
            session_service,
            session_store,
            settings_repository,
            user_settings_repository,
            user_service,
            cache_service,
            event_bus,
            app_data_dir: self.app_data_dir,
            trash_service,
        })
    }
}

/// Tests for ServiceBuilder
#[cfg(test)]
mod tests {
    use super::*;

    fn visit_service(
        service: &'static str,
        graph: &HashMap<&'static str, &'static [&'static str]>,
        visiting: &mut HashSet<&'static str>,
        visited: &mut HashSet<&'static str>,
    ) {
        if visited.contains(service) {
            return;
        }

        assert!(
            visiting.insert(service),
            "circular dependency detected while visiting {}",
            service
        );

        if let Some(dependencies) = graph.get(service) {
            for dependency in *dependencies {
                if graph.contains_key(dependency) {
                    visit_service(dependency, graph, visiting, visited);
                }
            }
        }

        visiting.remove(service);
        visited.insert(service);
    }

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

        // Verify event bus is initialized — only events in AuditLogHandler::interested_events()
        assert!(app_state.event_bus.has_handlers("TaskCreated"));
        assert!(app_state.event_bus.has_handlers("InterventionStarted"));
    }

    #[test]
    fn test_documented_service_graph_is_acyclic() {
        let graph: HashMap<_, _> = DOCUMENTED_SERVICE_DEPENDENCIES.iter().copied().collect();
        let mut visiting = HashSet::new();
        let mut visited = HashSet::new();

        for service in DOCUMENTED_SERVICE_INIT_ORDER {
            visit_service(service, &graph, &mut visiting, &mut visited);
        }
    }

    #[test]
    fn test_documented_service_initialization_order_respects_dependencies() {
        let init_positions: HashMap<_, _> = DOCUMENTED_SERVICE_INIT_ORDER
            .iter()
            .enumerate()
            .map(|(index, service)| (*service, index))
            .collect();

        for (service, dependencies) in DOCUMENTED_SERVICE_DEPENDENCIES {
            let service_index = init_positions
                .get(service)
                .copied()
                .expect("documented service must appear in init order");

            for dependency in *dependencies {
                if let Some(dependency_index) = init_positions.get(dependency) {
                    assert!(
                        dependency_index < &service_index,
                        "{dependency} must be initialized before {service}"
                    );
                }
            }
        }
    }
}
